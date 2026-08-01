package aiworker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/venturemate/vmbackend/internal/ai"
	"github.com/venturemate/vmbackend/internal/aijobs"
	"github.com/venturemate/vmbackend/internal/aistudio"
	"github.com/venturemate/vmbackend/internal/appbuilder"
	"github.com/venturemate/vmbackend/internal/assetstudio"
	"github.com/venturemate/vmbackend/internal/buildworker"
	"github.com/venturemate/vmbackend/internal/businesses"
	"github.com/venturemate/vmbackend/internal/deckstudio"
	"github.com/venturemate/vmbackend/internal/planstudio"
	"github.com/venturemate/vmbackend/internal/s3"
	"github.com/venturemate/vmbackend/internal/subscriptions"
)

type Processor struct {
	Jobs       *aijobs.Repository
	Projects   *aistudio.Repository
	Businesses *businesses.Repository
	Providers  *ai.ProviderManager
	Assets     *assetstudio.Service
	Storage    *s3.Service
	Builder    *buildworker.Runner
	Usage      *subscriptions.UsageRepository
	WorkerID   string
	PollEvery  time.Duration
}

func New(jobs *aijobs.Repository, projects *aistudio.Repository, businesses *businesses.Repository, providers *ai.ProviderManager, assets *assetstudio.Service, storage *s3.Service, usage *subscriptions.UsageRepository) *Processor {
	workerID := strings.TrimSpace(os.Getenv("AI_WORKER_ID"))
	if workerID == "" {
		host, _ := os.Hostname()
		workerID = fmt.Sprintf("%s-%d", host, os.Getpid())
	}
	return &Processor{Jobs: jobs, Projects: projects, Businesses: businesses, Providers: providers, Assets: assets, Storage: storage, Builder: buildworker.New(storage), Usage: usage, WorkerID: workerID, PollEvery: time.Second}
}

func (p *Processor) Run(ctx context.Context) error {
	if p.Jobs == nil || p.Projects == nil {
		return errors.New("AI worker repositories are unavailable")
	}
	if p.PollEvery < 250*time.Millisecond {
		p.PollEvery = time.Second
	}
	_, _ = p.Jobs.RecoverStale(ctx, 5*time.Minute)
	ticker := time.NewTicker(p.PollEvery)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			job, err := p.Jobs.ClaimNext(ctx, p.WorkerID)
			if err != nil {
				log.Printf("AI worker claim error: %v", err)
				continue
			}
			if job == nil {
				continue
			}
			p.processOne(ctx, job)
		}
	}
}

func (p *Processor) processOne(parent context.Context, job *aijobs.Job) {
	ctx, cancel := context.WithCancel(parent)
	defer cancel()
	var heartbeatWG sync.WaitGroup
	heartbeatWG.Add(1)
	go func() {
		defer heartbeatWG.Done()
		ticker := time.NewTicker(20 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if cancelRequested, err := p.Jobs.IsCancelRequested(ctx, job.ID, p.WorkerID); err == nil && cancelRequested {
					cancel()
					return
				}
				_ = p.Jobs.Heartbeat(ctx, job.ID, p.WorkerID)
			}
		}
	}()

	result, status, providerName, model, inputTokens, outputTokens, err := p.dispatch(ctx, job)
	cancel()
	heartbeatWG.Wait()
	if errors.Is(ctx.Err(), context.Canceled) {
		if requested, checkErr := p.Jobs.IsCancelRequested(parent, job.ID, p.WorkerID); checkErr == nil && requested {
			_ = p.Jobs.MarkCancelled(parent, job.ID, p.WorkerID)
			return
		}
	}
	if err != nil {
		// Provider usage can still be billable even when validation or persistence fails.
		p.recordTokenUsage(parent, job, inputTokens, outputTokens)
		retryable := isRetryable(err)
		_ = p.Jobs.Fail(parent, job.ID, p.WorkerID, errorCode(err), err.Error(), err.Error(), retryable)
		return
	}
	encoded, _ := json.Marshal(result)
	if err := p.Jobs.Complete(parent, job.ID, p.WorkerID, status, string(encoded), providerName, model, inputTokens, outputTokens, "Job completed successfully"); err != nil {
		log.Printf("AI worker completion error for %s: %v", job.ID, err)
		return
	}
	p.recordUsage(parent, job, inputTokens, outputTokens)
}

func (p *Processor) recordTokenUsage(ctx context.Context, job *aijobs.Job, inputTokens, outputTokens int64) {
	if p.Usage == nil || job == nil {
		return
	}
	if total := inputTokens + outputTokens; total > 0 {
		if err := p.Usage.IncrementAITokens(ctx, job.UserID, subscriptions.BillingPeriod(time.Now()), total); err != nil {
			log.Printf("AI usage token accounting failed for %s: %v", job.ID, err)
		}
	}
}

func (p *Processor) recordUsage(ctx context.Context, job *aijobs.Job, inputTokens, outputTokens int64) {
	if p.Usage == nil || job == nil {
		return
	}
	period := subscriptions.BillingPeriod(time.Now())
	p.recordTokenUsage(ctx, job, inputTokens, outputTokens)
	metric := map[string]string{
		"asset": "recraft_images", "thumbnail": "recraft_images",
		"build": "ai_builds", "export": "ai_exports", "deploy": "ai_deployments",
	}[job.JobType]
	if metric != "" {
		if err := p.Usage.IncrementAIStudioMetric(ctx, job.UserID, period, metric, 1); err != nil {
			log.Printf("AI Studio usage accounting failed for %s: %v", job.ID, err)
		}
	}
	if p.Projects != nil {
		if bytes, err := p.Projects.UserProjectBytes(ctx, job.UserID); err != nil {
			log.Printf("AI Studio byte accounting failed for %s: %v", job.ID, err)
		} else if err := p.Usage.UpdateAIProjectBytes(ctx, job.UserID, period, bytes); err != nil {
			log.Printf("AI Studio byte usage update failed for %s: %v", job.ID, err)
		}
	}
}

func (p *Processor) dispatch(ctx context.Context, job *aijobs.Job) (any, string, string, string, int64, int64, error) {
	switch job.JobType {
	case "generate", "revise", "repair", "plan":
		return p.generate(ctx, job)
	case "asset", "thumbnail":
		return p.generateAsset(ctx, job)
	case "build":
		return p.build(ctx, job)
	case "export":
		return p.export(ctx, job)
	case "deploy":
		return p.deploy(ctx, job)
	default:
		return nil, "", "", "", 0, 0, fmt.Errorf("unsupported job type %s", job.JobType)
	}
}

type generationRequest struct {
	Prompt          string                     `json:"prompt"`
	Provider        string                     `json:"provider"`
	RevisionID      string                     `json:"revisionId"`
	CurrentDocument string                     `json:"currentDocument"`
	Projection      planstudio.ProjectionInput `json:"projection"`
}

func (p *Processor) generate(ctx context.Context, job *aijobs.Job) (any, string, string, string, int64, int64, error) {
	var request generationRequest
	if err := json.Unmarshal([]byte(job.Request), &request); err != nil {
		return nil, "", "", "", 0, 0, err
	}
	project, err := p.Projects.GetProject(ctx, job.UserID, job.ProjectID)
	if err != nil || project == nil {
		return nil, "", "", "", 0, 0, errors.New("project not found or access denied")
	}
	provider, err := p.Providers.Resolve(request.Provider)
	if err != nil {
		return nil, "", "", "", 0, 0, err
	}
	var business *businesses.Business
	if project.BusinessID != "" && p.Businesses != nil {
		business, err = p.Businesses.GetByIDAndUser(ctx, project.BusinessID, job.UserID)
		if err != nil {
			return nil, "", "", "", 0, 0, err
		}
	}
	_ = p.Jobs.UpdateProgress(ctx, job.ID, p.WorkerID, "planning", "Preparing verified business context", 10, "Loaded project context")

	var revision *aistudio.Revision
	var response *ai.ProviderResponse
	switch project.ProjectType {
	case aistudio.ProjectTypeWebApp:
		files, err := p.Projects.ListFiles(ctx, job.UserID, project.ID)
		if err != nil {
			return nil, "", "", "", 0, 0, err
		}
		_ = p.Jobs.UpdateProgress(ctx, job.ID, p.WorkerID, "generating", "Generating structured file changes", 30, "Calling AI provider")
		result, changes, providerResponse, err := appbuilder.Generate(ctx, provider, project, business, request.Prompt, files)
		if err != nil {
			return nil, "", "", "", 0, 0, err
		}
		response = providerResponse
		document, _ := json.Marshal(result.AppSpec)
		manifest, _ := json.Marshal(map[string]any{"expectedRoutes": result.ExpectedRoutes, "assetRequests": result.AssetRequests, "schemaChanges": result.SchemaChanges})
		revision, err = p.Projects.CreateRevision(ctx, aistudio.RevisionInput{ProjectID: project.ID, UserID: job.UserID, Source: sourceForJob(job.JobType), Prompt: request.Prompt, Summary: result.Summary, SchemaVersion: result.AppSpec.SchemaVersion, Document: string(document), Manifest: string(manifest), TokenUsage: tokenUsageJSON(response), Files: changes})
		if err != nil {
			return nil, "", "", "", 0, 0, err
		}
	case aistudio.ProjectTypePitchDeck:
		current := request.CurrentDocument
		if current == "" && project.CurrentRevisionID != "" {
			if currentRevision, getErr := p.Projects.GetRevision(ctx, job.UserID, project.CurrentRevisionID); getErr == nil && currentRevision != nil {
				current = currentRevision.Document
			}
		}
		_ = p.Jobs.UpdateProgress(ctx, job.ID, p.WorkerID, "generating", "Composing editable investor narrative", 35, "Calling AI provider")
		document, providerResponse, err := deckstudio.Generate(ctx, provider, business, request.Prompt, current)
		if err != nil {
			return nil, "", "", "", 0, 0, err
		}
		response = providerResponse
		encoded, _ := json.Marshal(document)
		revision, err = p.Projects.CreateRevision(ctx, aistudio.RevisionInput{ProjectID: project.ID, UserID: job.UserID, Source: sourceForJob(job.JobType), Prompt: request.Prompt, Summary: "Editable pitch deck generated", SchemaVersion: deckstudio.SchemaVersion, Document: string(encoded), TokenUsage: tokenUsageJSON(response)})
		if err != nil {
			return nil, "", "", "", 0, 0, err
		}
	case aistudio.ProjectTypeBusinessPlan:
		current := request.CurrentDocument
		if current == "" && project.CurrentRevisionID != "" {
			if currentRevision, getErr := p.Projects.GetRevision(ctx, job.UserID, project.CurrentRevisionID); getErr == nil && currentRevision != nil {
				current = currentRevision.Document
			}
		}
		var projection *planstudio.Projection
		if request.Projection.Years > 0 {
			projection, err = planstudio.CalculateProjection(request.Projection)
			if err != nil {
				return nil, "", "", "", 0, 0, err
			}
		}
		_ = p.Jobs.UpdateProgress(ctx, job.ID, p.WorkerID, "generating", "Writing long-form plan sections", 35, "Calling AI provider")
		document, providerResponse, err := planstudio.Generate(ctx, provider, business, request.Prompt, current, projection)
		if err != nil {
			return nil, "", "", "", 0, 0, err
		}
		response = providerResponse
		encoded, _ := json.Marshal(document)
		revision, err = p.Projects.CreateRevision(ctx, aistudio.RevisionInput{ProjectID: project.ID, UserID: job.UserID, Source: sourceForJob(job.JobType), Prompt: request.Prompt, Summary: "Editable business plan generated", SchemaVersion: planstudio.SchemaVersion, Document: string(encoded), TokenUsage: tokenUsageJSON(response)})
		if err != nil {
			return nil, "", "", "", 0, 0, err
		}
	default:
		return nil, "", "", "", 0, 0, fmt.Errorf("unsupported project type %s", project.ProjectType)
	}
	_ = p.Jobs.UpdateProgress(ctx, job.ID, p.WorkerID, "review", "Generation is ready for review", 95, "Created reviewable revision "+revision.ID)
	inputTokens, outputTokens := usage(response)
	return map[string]any{"projectId": project.ID, "revisionId": revision.ID, "status": "awaiting_review"}, "awaiting_review", providerName(response, provider), modelName(response, provider), inputTokens, outputTokens, nil
}

type assetRequest struct {
	assetstudio.GenerateInput
}

func (p *Processor) generateAsset(ctx context.Context, job *aijobs.Job) (any, string, string, string, int64, int64, error) {
	var request assetstudio.GenerateInput
	if err := json.Unmarshal([]byte(job.Request), &request); err != nil {
		return nil, "", "", "", 0, 0, err
	}
	request.UserID, request.ProjectID, request.BusinessID = job.UserID, job.ProjectID, job.BusinessID
	_ = p.Jobs.UpdateProgress(ctx, job.ID, p.WorkerID, "generating_asset", "Generating visual with Recraft", 30, "Calling Recraft")
	asset, err := p.Assets.Generate(ctx, request)
	if err != nil {
		return nil, "", "", "", 0, 0, err
	}
	return map[string]any{"asset": asset}, "completed", "recraft", asset.Model, 0, 0, nil
}

type buildRequest struct {
	RevisionID string `json:"revisionId"`
}

func (p *Processor) build(ctx context.Context, job *aijobs.Job) (any, string, string, string, int64, int64, error) {
	var request buildRequest
	_ = json.Unmarshal([]byte(job.Request), &request)
	project, err := p.Projects.GetProject(ctx, job.UserID, job.ProjectID)
	if err != nil || project == nil {
		return nil, "", "", "", 0, 0, errors.New("project not found")
	}
	if project.ProjectType != aistudio.ProjectTypeWebApp {
		return nil, "", "", "", 0, 0, errors.New("builds are only supported for web app projects")
	}
	if request.RevisionID == "" {
		request.RevisionID = project.ApprovedRevisionID
	}
	if request.RevisionID == "" {
		return nil, "", "", "", 0, 0, errors.New("approve a revision before building")
	}
	files, err := p.Projects.ResolveFilesAtRevision(ctx, job.UserID, project.ID, request.RevisionID)
	if err != nil {
		return nil, "", "", "", 0, 0, err
	}
	build, err := p.Projects.CreateBuild(ctx, job.UserID, aistudio.Build{ProjectID: project.ID, RevisionID: request.RevisionID, JobID: job.ID, Status: "running", RuntimeVersion: "node"})
	if err != nil {
		return nil, "", "", "", 0, 0, err
	}
	result, buildErr := p.Builder.Build(ctx, project.ID, request.RevisionID, files, func(step, message string, percent int, logLine string) error {
		return p.Jobs.UpdateProgress(ctx, job.ID, p.WorkerID, step, message, percent, logLine)
	})
	if buildErr != nil {
		diagnostics := buildworker.DiagnosticsJSON(result)
		logs := ""
		if result != nil {
			logs = result.Logs
		}
		_, _ = p.Projects.UpdateBuild(context.Background(), build.ID, "failed", "", "", diagnostics, logs)
		return nil, "", "", "", 0, 0, buildErr
	}
	updated, err := p.Projects.UpdateBuild(ctx, build.ID, "completed", result.ArtifactKey, result.PreviewURL, buildworker.DiagnosticsJSON(result), result.Logs)
	if err != nil {
		return nil, "", "", "", 0, 0, err
	}
	return map[string]any{"build": updated}, "completed", "", "", 0, 0, nil
}

type exportRequest struct {
	RevisionID string `json:"revisionId"`
	Format     string `json:"format"`
}

func (p *Processor) export(ctx context.Context, job *aijobs.Job) (any, string, string, string, int64, int64, error) {
	var request exportRequest
	if err := json.Unmarshal([]byte(job.Request), &request); err != nil {
		return nil, "", "", "", 0, 0, err
	}
	project, err := p.Projects.GetProject(ctx, job.UserID, job.ProjectID)
	if err != nil || project == nil {
		return nil, "", "", "", 0, 0, errors.New("project not found")
	}
	format := strings.ToLower(strings.TrimSpace(request.Format))
	if format != "zip" && format != "source" {
		return nil, "", "", "", 0, 0, fmt.Errorf("server export format %s is not supported; use the native deck/plan exporter", format)
	}
	files, err := p.Projects.ResolveFilesAtRevision(ctx, job.UserID, project.ID, request.RevisionID)
	if err != nil {
		return nil, "", "", "", 0, 0, err
	}
	data, err := buildworker.SourceZip(files)
	if err != nil {
		return nil, "", "", "", 0, 0, err
	}
	key := s3.GenerateKey("ai-studio/"+project.ID+"/exports", project.Slug+"-source.zip")
	url, err := p.Storage.Upload(ctx, key, data, "application/zip")
	if err != nil {
		return nil, "", "", "", 0, 0, err
	}
	return map[string]any{"format": "zip", "storageKey": key, "url": url}, "completed", "", "", 0, 0, nil
}

type deployRequest struct {
	BuildID  string `json:"buildId"`
	Provider string `json:"provider"`
}

func (p *Processor) deploy(ctx context.Context, job *aijobs.Job) (any, string, string, string, int64, int64, error) {
	var request deployRequest
	if err := json.Unmarshal([]byte(job.Request), &request); err != nil {
		return nil, "", "", "", 0, 0, err
	}
	provider := strings.ToLower(strings.TrimSpace(request.Provider))
	if provider == "" {
		provider = "venturemate"
	}
	if provider != "venturemate" && provider != "github" && provider != "netlify" {
		return nil, "", "", "", 0, 0, errors.New("unsupported deployment provider")
	}

	project, err := p.Projects.GetProject(ctx, job.UserID, job.ProjectID)
	if err != nil || project == nil {
		return nil, "", "", "", 0, 0, errors.New("project not found")
	}
	build, err := p.Projects.GetBuild(ctx, job.UserID, request.BuildID)
	if err != nil {
		return nil, "", "", "", 0, 0, err
	}
	if build == nil || build.ProjectID != job.ProjectID {
		return nil, "", "", "", 0, 0, errors.New("completed build not found for this project")
	}
	if build.Status != "completed" || strings.TrimSpace(build.PreviewURL) == "" {
		return nil, "", "", "", 0, 0, errors.New("build must complete successfully before deployment")
	}

	deployment := aistudio.Deployment{
		ProjectID: project.ID, RevisionID: build.RevisionID, BuildID: build.ID, JobID: job.ID,
		Provider: provider, Status: "completed",
	}
	switch provider {
	case "venturemate":
		metadata, _ := json.Marshal(map[string]any{"mode": "venturemate_static", "artifactStorageKey": build.ArtifactStorageKey})
		deployment.ExternalID = build.ArtifactStorageKey
		deployment.URL = build.PreviewURL
		deployment.Metadata = string(metadata)
		deployment.Logs = "Static build published from the approved VentureMate revision"
	case "github":
		files, resolveErr := p.Projects.ResolveFilesAtRevision(ctx, job.UserID, project.ID, build.RevisionID)
		if resolveErr != nil {
			return nil, "", "", "", 0, 0, resolveErr
		}
		source := make([]ai.ProjectFile, 0, len(files))
		for _, file := range files {
			source = append(source, ai.ProjectFile{Path: file.Path, Content: file.CurrentContent})
		}
		result, deployErr := ai.DeployToGitHub(ctx, source, project.Slug, project.Name+" generated by VentureMate AI Studio")
		if deployErr != nil {
			return nil, "", "", "", 0, 0, deployErr
		}
		metadata, _ := json.Marshal(map[string]any{"repoName": result.RepoName})
		deployment.ExternalID = result.RepoName
		deployment.URL = result.URL
		deployment.Metadata = string(metadata)
		deployment.Logs = result.Message
	case "netlify":
		if p.Storage == nil || strings.TrimSpace(build.ArtifactStorageKey) == "" {
			return nil, "", "", "", 0, 0, errors.New("build artifact storage is unavailable")
		}
		artifact, _, downloadErr := p.Storage.Download(ctx, build.ArtifactStorageKey)
		if downloadErr != nil {
			return nil, "", "", "", 0, 0, downloadErr
		}
		result, deployErr := ai.DeployToNetlify(ctx, artifact, project.Slug)
		if deployErr != nil {
			return nil, "", "", "", 0, 0, deployErr
		}
		metadata, _ := json.Marshal(map[string]any{"siteName": result.SiteName, "artifactStorageKey": build.ArtifactStorageKey})
		deployment.ExternalID = result.SiteName
		deployment.URL = result.URL
		deployment.Metadata = string(metadata)
		deployment.Logs = result.Message
	}

	created, err := p.Projects.CreateDeployment(ctx, job.UserID, deployment)
	if err != nil {
		return nil, "", "", "", 0, 0, err
	}
	if _, err := p.Projects.SetProjectPublished(ctx, job.UserID, job.ProjectID, true); err != nil {
		return nil, "", "", "", 0, 0, err
	}
	return map[string]any{"deployment": created}, "completed", "", "", 0, 0, nil
}

func sourceForJob(jobType string) string {
	if jobType == "repair" {
		return "repair"
	}
	return "ai"
}

func tokenUsageJSON(response *ai.ProviderResponse) string {
	if response == nil || response.TokenUsage == nil {
		return "{}"
	}
	value, _ := json.Marshal(response.TokenUsage)
	return string(value)
}

func usage(response *ai.ProviderResponse) (int64, int64) {
	if response == nil || response.TokenUsage == nil {
		return 0, 0
	}
	return int64(response.TokenUsage.InputTokens), int64(response.TokenUsage.OutputTokens)
}

func providerName(response *ai.ProviderResponse, provider ai.Provider) string {
	if response != nil && response.Provider != "" {
		return response.Provider
	}
	return provider.Name()
}
func modelName(response *ai.ProviderResponse, provider ai.Provider) string {
	if response != nil && response.Model != "" {
		return response.Model
	}
	return provider.Model()
}

func isRetryable(err error) bool {
	value := strings.ToLower(err.Error())
	return strings.Contains(value, "timeout") || strings.Contains(value, "temporar") || strings.Contains(value, "429") || strings.Contains(value, "502") || strings.Contains(value, "503")
}
func errorCode(err error) string {
	if errors.Is(err, context.DeadlineExceeded) {
		return "TIMEOUT"
	}
	if errors.Is(err, context.Canceled) {
		return "CANCELLED"
	}
	return "JOB_FAILED"
}
