package graph

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/aijobs"
	"github.com/venturemate/vmbackend/internal/aistudio"
	"github.com/venturemate/vmbackend/internal/appbuilder"
	"github.com/venturemate/vmbackend/internal/auth"
	"github.com/venturemate/vmbackend/internal/deckstudio"
	"github.com/venturemate/vmbackend/internal/planstudio"
	"github.com/venturemate/vmbackend/internal/subscriptions"
)

func requireAIStudioUser(p graphql.ResolveParams) (string, error) {
	userID, ok := auth.UserIDFromContext(p.Context)
	if !ok || strings.TrimSpace(userID) == "" {
		return "", errors.New("authentication required")
	}
	if AppContainer == nil || AppContainer.AIStudioRepo == nil || AppContainer.AIJobRepo == nil {
		return "", errors.New("AI Studio service unavailable")
	}
	return userID, nil
}

var aiProjectType = graphql.NewObject(graphql.ObjectConfig{Name: "AIProject", Fields: graphql.Fields{
	"id": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)}, "businessId": &graphql.Field{Type: graphql.ID},
	"projectType": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "name": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"slug": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "status": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"framework": &graphql.Field{Type: graphql.String}, "templateVersion": &graphql.Field{Type: graphql.String},
	"currentRevisionId": &graphql.Field{Type: graphql.ID}, "approvedRevisionId": &graphql.Field{Type: graphql.ID},
	"settings": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "metadata": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"createdAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "updatedAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
}})

var aiRevisionType = graphql.NewObject(graphql.ObjectConfig{Name: "AIProjectRevision", Fields: graphql.Fields{
	"id": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)}, "projectId": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
	"parentRevisionId": &graphql.Field{Type: graphql.ID}, "source": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"prompt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "summary": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"status": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "schemaVersion": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"document": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "manifest": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"diagnostics": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "tokenUsage": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"contentHash": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "createdAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"updatedAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
}})

var aiProjectFileType = graphql.NewObject(graphql.ObjectConfig{Name: "AIProjectFile", Fields: graphql.Fields{
	"id": &graphql.Field{Type: graphql.ID}, "projectId": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
	"path": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "language": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"isBinary": &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)}, "assetId": &graphql.Field{Type: graphql.ID},
	"currentContent": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "contentHash": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"sizeBytes": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)}, "createdAt": &graphql.Field{Type: graphql.String}, "updatedAt": &graphql.Field{Type: graphql.String},
}})

var aiJobType = graphql.NewObject(graphql.ObjectConfig{Name: "AIGenerationJob", Fields: graphql.Fields{
	"id": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)}, "businessId": &graphql.Field{Type: graphql.ID}, "projectId": &graphql.Field{Type: graphql.ID},
	"artifactType": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "jobType": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"status": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "progress": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
	"step": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "message": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"request": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "result": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"errorCode": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "errorMessage": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"logs": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "provider": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"model": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "inputTokens": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
	"outputTokens": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)}, "attemptCount": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
	"maxAttempts": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)}, "cancelRequested": &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
	"createdAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "updatedAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"startedAt": &graphql.Field{Type: graphql.String}, "completedAt": &graphql.Field{Type: graphql.String},
}})

var aiAssetType = graphql.NewObject(graphql.ObjectConfig{Name: "AIAsset", Fields: graphql.Fields{
	"id": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)}, "businessId": &graphql.Field{Type: graphql.ID}, "projectId": &graphql.Field{Type: graphql.ID},
	"source": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "kind": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"prompt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "model": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"style": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "mimeType": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"width": &graphql.Field{Type: graphql.Int}, "height": &graphql.Field{Type: graphql.Int}, "sizeBytes": &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
	"storageKey": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "url": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"thumbnailUrl": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "metadata": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"createdAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "updatedAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
}})

var aiBuildType = graphql.NewObject(graphql.ObjectConfig{Name: "AIProjectBuild", Fields: graphql.Fields{
	"id": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)}, "projectId": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
	"revisionId": &graphql.Field{Type: graphql.ID}, "jobId": &graphql.Field{Type: graphql.ID}, "status": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"runtimeVersion": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "artifactStorageKey": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"previewUrl": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "diagnostics": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"logs": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "createdAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"updatedAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
}})

var aiDeploymentType = graphql.NewObject(graphql.ObjectConfig{Name: "AIProjectDeployment", Fields: graphql.Fields{
	"id": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)}, "projectId": &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
	"revisionId": &graphql.Field{Type: graphql.ID}, "buildId": &graphql.Field{Type: graphql.ID}, "jobId": &graphql.Field{Type: graphql.ID},
	"provider": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "status": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"externalId": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "url": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"metadata": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "logs": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	"createdAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)}, "updatedAt": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
}})

func init() {
	rootQuery.AddFieldConfig("aiProjects", &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(aiProjectType))), Args: graphql.FieldConfigArgument{
		"businessId": &graphql.ArgumentConfig{Type: graphql.ID}, "projectType": &graphql.ArgumentConfig{Type: graphql.String},
	}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return AppContainer.AIStudioRepo.ListProjects(p.Context, userID, stringArg(p.Args, "businessId"), stringArg(p.Args, "projectType"), 100, 0)
	}})
	rootQuery.AddFieldConfig("aiProject", &graphql.Field{Type: aiProjectType, Args: graphql.FieldConfigArgument{"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return AppContainer.AIStudioRepo.GetProject(p.Context, userID, p.Args["id"].(string))
	}})
	rootQuery.AddFieldConfig("aiProjectFiles", &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(aiProjectFileType))), Args: graphql.FieldConfigArgument{
		"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "revisionId": &graphql.ArgumentConfig{Type: graphql.ID},
	}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return AppContainer.AIStudioRepo.ResolveFilesAtRevision(p.Context, userID, p.Args["projectId"].(string), stringArg(p.Args, "revisionId"))
	}})
	rootQuery.AddFieldConfig("aiProjectRevisions", &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(aiRevisionType))), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return AppContainer.AIStudioRepo.ListRevisions(p.Context, userID, p.Args["projectId"].(string), 100, 0)
	}})
	rootQuery.AddFieldConfig("aiGenerationJob", &graphql.Field{Type: aiJobType, Args: graphql.FieldConfigArgument{"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return AppContainer.AIJobRepo.Get(p.Context, userID, p.Args["id"].(string))
	}})
	rootQuery.AddFieldConfig("aiGenerationJobs", &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(aiJobType))), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.ID}, "status": &graphql.ArgumentConfig{Type: graphql.String}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return AppContainer.AIJobRepo.List(p.Context, userID, stringArg(p.Args, "projectId"), stringArg(p.Args, "status"), 100, 0)
	}})
	rootQuery.AddFieldConfig("aiAssets", &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(aiAssetType))), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.ID}, "businessId": &graphql.ArgumentConfig{Type: graphql.ID}, "kind": &graphql.ArgumentConfig{Type: graphql.String}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return AppContainer.AIStudioRepo.ListAssets(p.Context, userID, stringArg(p.Args, "businessId"), stringArg(p.Args, "projectId"), stringArg(p.Args, "kind"), 200)
	}})
	rootQuery.AddFieldConfig("aiBuilds", &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(aiBuildType))), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return AppContainer.AIStudioRepo.ListBuilds(p.Context, userID, p.Args["projectId"].(string), 50)
	}})
	rootQuery.AddFieldConfig("aiDeployments", &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(aiDeploymentType))), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return AppContainer.AIStudioRepo.ListDeployments(p.Context, userID, p.Args["projectId"].(string), 50)
	}})

	rootMutation.AddFieldConfig("createAiProject", &graphql.Field{Type: graphql.NewNonNull(aiProjectType), Args: graphql.FieldConfigArgument{
		"name": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)}, "projectType": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		"businessId": &graphql.ArgumentConfig{Type: graphql.ID}, "settings": &graphql.ArgumentConfig{Type: graphql.String},
	}, Resolve: createAIProjectResolver})
	rootMutation.AddFieldConfig("renameAiProject", &graphql.Field{Type: graphql.NewNonNull(aiProjectType), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "name": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return AppContainer.AIStudioRepo.RenameProject(p.Context, userID, p.Args["projectId"].(string), p.Args["name"].(string))
	}})
	rootMutation.AddFieldConfig("archiveAiProject", &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return false, err
		}
		err = AppContainer.AIStudioRepo.ArchiveProject(p.Context, userID, p.Args["projectId"].(string))
		if err == nil {
			updateAIProjectUsage(p.Context, userID)
		}
		return err == nil, err
	}})
	rootMutation.AddFieldConfig("createAiRevision", &graphql.Field{Type: graphql.NewNonNull(aiRevisionType), Args: graphql.FieldConfigArgument{
		"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "summary": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		"document": &graphql.ArgumentConfig{Type: graphql.String}, "manifest": &graphql.ArgumentConfig{Type: graphql.String}, "fileChanges": &graphql.ArgumentConfig{Type: graphql.String},
		"schemaVersion": &graphql.ArgumentConfig{Type: graphql.String},
	}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		var changes []aistudio.FileChange
		if raw := stringArg(p.Args, "fileChanges"); raw != "" {
			if err := json.Unmarshal([]byte(raw), &changes); err != nil {
				return nil, errors.New("fileChanges must be valid JSON")
			}
		}
		if err := enforceAIStudioStorageQuota(p.Context, userID); err != nil {
			return nil, err
		}
		revision, err := AppContainer.AIStudioRepo.CreateRevision(p.Context, aistudio.RevisionInput{ProjectID: p.Args["projectId"].(string), UserID: userID, Source: "manual", Summary: p.Args["summary"].(string), SchemaVersion: stringArg(p.Args, "schemaVersion"), Document: stringArg(p.Args, "document"), Manifest: stringArg(p.Args, "manifest"), Files: changes})
		if err == nil {
			updateAIProjectUsage(p.Context, userID)
		}
		return revision, err
	}})
	rootMutation.AddFieldConfig("updateAiProjectFile", &graphql.Field{Type: graphql.NewNonNull(aiRevisionType), Args: graphql.FieldConfigArgument{
		"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "path": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		"content": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)}, "baseHash": &graphql.ArgumentConfig{Type: graphql.String}, "summary": &graphql.ArgumentConfig{Type: graphql.String},
	}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		if err := enforceAIStudioStorageQuota(p.Context, userID); err != nil {
			return nil, err
		}
		revision, err := AppContainer.AIStudioRepo.UpdateProjectFile(p.Context, userID, p.Args["projectId"].(string), p.Args["path"].(string), p.Args["content"].(string), stringArg(p.Args, "baseHash"), stringArg(p.Args, "summary"))
		if err != nil {
			return nil, err
		}
		if err := syncRuntimeRevision(p.Context, userID, revision.ProjectID, revision.ID); err != nil {
			return nil, err
		}
		updateAIProjectUsage(p.Context, userID)
		return revision, nil
	}})
	rootMutation.AddFieldConfig("applyAiProposalBatch", &graphql.Field{Type: graphql.NewNonNull(aiProjectType), Args: graphql.FieldConfigArgument{"batchId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		batch, err := AppContainer.AIStudioRepo.GetProposalBatch(p.Context, userID, p.Args["batchId"].(string))
		if err != nil || batch == nil {
			return nil, errors.New("proposal batch not found")
		}
		if batch.RevisionID == "" {
			return nil, errors.New("proposal batch has no revision")
		}
		project, err := approveRevisionAndSync(p.Context, userID, batch.RevisionID)
		if err != nil {
			return nil, err
		}
		if err := AppContainer.AIStudioRepo.MarkProposalBatch(p.Context, userID, batch.ID, "applied"); err != nil {
			return nil, err
		}
		return project, nil
	}})
	rootMutation.AddFieldConfig("approveAiRevision", &graphql.Field{Type: graphql.NewNonNull(aiProjectType), Args: graphql.FieldConfigArgument{"revisionId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return approveRevisionAndSync(p.Context, userID, p.Args["revisionId"].(string))
	}})
	rootMutation.AddFieldConfig("rollbackAiProject", &graphql.Field{Type: graphql.NewNonNull(aiRevisionType), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "revisionId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		revision, err := AppContainer.AIStudioRepo.RollbackProject(p.Context, userID, p.Args["projectId"].(string), p.Args["revisionId"].(string))
		if err != nil {
			return nil, err
		}
		if err := syncRuntimeRevision(p.Context, userID, revision.ProjectID, revision.ID); err != nil {
			return nil, err
		}
		updateAIProjectUsage(p.Context, userID)
		return revision, nil
	}})
	rootMutation.AddFieldConfig("startAiGeneration", &graphql.Field{Type: graphql.NewNonNull(aiJobType), Args: graphql.FieldConfigArgument{
		"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "prompt": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		"provider": &graphql.ArgumentConfig{Type: graphql.String}, "projection": &graphql.ArgumentConfig{Type: graphql.String},
	}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		return createProjectJob(p, "generate", map[string]any{"prompt": p.Args["prompt"], "provider": stringArg(p.Args, "provider"), "projection": jsonRawOrObject(stringArg(p.Args, "projection"))})
	}})
	rootMutation.AddFieldConfig("cancelAiGeneration", &graphql.Field{Type: graphql.NewNonNull(aiJobType), Args: graphql.FieldConfigArgument{"jobId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		return AppContainer.AIJobRepo.Cancel(p.Context, userID, p.Args["jobId"].(string))
	}})
	rootMutation.AddFieldConfig("startAiBuild", &graphql.Field{Type: graphql.NewNonNull(aiJobType), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "revisionId": &graphql.ArgumentConfig{Type: graphql.ID}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		return createProjectJob(p, "build", map[string]any{"revisionId": stringArg(p.Args, "revisionId")})
	}})
	rootMutation.AddFieldConfig("startAiRepair", &graphql.Field{Type: graphql.NewNonNull(aiJobType), Args: graphql.FieldConfigArgument{
		"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "buildId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "prompt": &graphql.ArgumentConfig{Type: graphql.String},
	}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		projectID := p.Args["projectId"].(string)
		project, err := AppContainer.AIStudioRepo.GetProject(p.Context, userID, projectID)
		if err != nil || project == nil {
			return nil, errors.New("project not found or access denied")
		}
		build, err := AppContainer.AIStudioRepo.GetBuild(p.Context, userID, p.Args["buildId"].(string))
		if err != nil || build == nil || build.ProjectID != projectID {
			return nil, errors.New("failed build not found for this project")
		}
		if build.Status != "failed" {
			return nil, errors.New("only failed builds can be repaired")
		}
		requestText := stringArg(p.Args, "prompt")
		if requestText == "" {
			requestText = "Repair the build errors while preserving all unrelated files and manual edits."
		}
		diagnostics := build.Logs
		if len(diagnostics) > 24000 {
			diagnostics = diagnostics[len(diagnostics)-24000:]
		}
		if err := enforceAIStudioJobQuota(p.Context, userID, "repair"); err != nil {
			return nil, err
		}
		encoded, _ := json.Marshal(map[string]any{"prompt": requestText + "\n\nFAILED BUILD DIAGNOSTICS:\n" + diagnostics, "revisionId": build.RevisionID})
		return AppContainer.AIJobRepo.Create(p.Context, aijobs.CreateInput{UserID: userID, BusinessID: project.BusinessID, ProjectID: project.ID, ArtifactType: project.ProjectType, JobType: "repair", Request: string(encoded), MaxAttempts: 2})
	}})
	rootMutation.AddFieldConfig("startAiExport", &graphql.Field{Type: graphql.NewNonNull(aiJobType), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "revisionId": &graphql.ArgumentConfig{Type: graphql.ID}, "format": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		return createProjectJob(p, "export", map[string]any{"revisionId": stringArg(p.Args, "revisionId"), "format": p.Args["format"]})
	}})
	rootMutation.AddFieldConfig("startAiDeployment", &graphql.Field{Type: graphql.NewNonNull(aiJobType), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "buildId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}, "provider": &graphql.ArgumentConfig{Type: graphql.String}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		return createProjectJob(p, "deploy", map[string]any{"buildId": p.Args["buildId"], "provider": stringArg(p.Args, "provider")})
	}})
	rootMutation.AddFieldConfig("generateAiAsset", &graphql.Field{Type: graphql.NewNonNull(aiJobType), Args: graphql.FieldConfigArgument{
		"projectId": &graphql.ArgumentConfig{Type: graphql.ID}, "businessId": &graphql.ArgumentConfig{Type: graphql.ID}, "kind": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		"subject": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)}, "purpose": &graphql.ArgumentConfig{Type: graphql.String}, "style": &graphql.ArgumentConfig{Type: graphql.String},
		"size": &graphql.ArgumentConfig{Type: graphql.String}, "vector": &graphql.ArgumentConfig{Type: graphql.Boolean}, "pro": &graphql.ArgumentConfig{Type: graphql.Boolean},
	}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return nil, err
		}
		projectID, businessID := stringArg(p.Args, "projectId"), stringArg(p.Args, "businessId")
		if projectID != "" {
			project, projectErr := AppContainer.AIStudioRepo.GetProject(p.Context, userID, projectID)
			if projectErr != nil || project == nil {
				return nil, errors.New("project not found or access denied")
			}
			businessID = project.BusinessID
		} else if businessID != "" {
			if _, businessErr := requireOwnedBusiness(p, businessID); businessErr != nil {
				return nil, businessErr
			}
		}
		if err := enforceAIStudioJobQuota(p.Context, userID, "asset"); err != nil {
			return nil, err
		}
		request := map[string]any{"kind": p.Args["kind"], "subject": p.Args["subject"], "purpose": stringArg(p.Args, "purpose"), "style": stringArg(p.Args, "style"), "size": stringArg(p.Args, "size"), "vector": boolArg(p.Args, "vector"), "pro": boolArg(p.Args, "pro")}
		encoded, _ := json.Marshal(request)
		return AppContainer.AIJobRepo.Create(p.Context, aijobs.CreateInput{UserID: userID, BusinessID: businessID, ProjectID: projectID, ArtifactType: "asset", JobType: "asset", Request: string(encoded), MaxAttempts: 3})
	}})
	rootMutation.AddFieldConfig("deleteAiAsset", &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean), Args: graphql.FieldConfigArgument{"assetId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
		userID, err := requireAIStudioUser(p)
		if err != nil {
			return false, err
		}
		key, err := AppContainer.AIStudioRepo.DeleteAsset(p.Context, userID, p.Args["assetId"].(string))
		if err != nil {
			return false, err
		}
		_, err = AppContainer.S3.Delete(p.Context, key)
		if err == nil {
			updateAIProjectUsage(p.Context, userID)
		}
		return err == nil, err
	}})
	for _, config := range []struct {
		name      string
		published bool
	}{{"publishAiProject", true}, {"unpublishAiProject", false}} {
		name, published := config.name, config.published
		rootMutation.AddFieldConfig(name, &graphql.Field{Type: graphql.NewNonNull(aiProjectType), Args: graphql.FieldConfigArgument{"projectId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)}}, Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			userID, err := requireAIStudioUser(p)
			if err != nil {
				return nil, err
			}
			return AppContainer.AIStudioRepo.SetProjectPublished(p.Context, userID, p.Args["projectId"].(string), published)
		}})
	}
}

func createAIProjectResolver(p graphql.ResolveParams) (interface{}, error) {
	userID, err := requireAIStudioUser(p)
	if err != nil {
		return nil, err
	}
	projectType := p.Args["projectType"].(string)
	if err := enforceAIStudioStorageQuota(p.Context, userID); err != nil {
		return nil, err
	}
	if AppContainer.SubscriptionRepo != nil && AppContainer.PlanEnforcer != nil {
		_, plan, subscriptionErr := AppContainer.SubscriptionRepo.GetUserSubscription(p.Context, userID)
		if subscriptionErr != nil {
			return nil, subscriptionErr
		}
		if plan != nil {
			count, countErr := AppContainer.AIStudioRepo.CountProjects(p.Context, userID)
			if countErr != nil {
				return nil, countErr
			}
			if quotaErr := AppContainer.PlanEnforcer.CheckAIProjectLimit(p.Context, plan.Name, count); quotaErr != nil {
				return nil, quotaErr
			}
		}
	}
	framework, version := "", "2.0"
	if projectType == aistudio.ProjectTypeWebApp {
		framework, version = "react-vite-typescript", "react-app-v1"
	}
	project, err := AppContainer.AIStudioRepo.CreateProject(p.Context, userID, stringArg(p.Args, "businessId"), projectType, p.Args["name"].(string), framework, version, stringArg(p.Args, "settings"), "{}")
	if err != nil {
		return nil, err
	}
	runtimeKey := ""
	if projectType == aistudio.ProjectTypeWebApp {
		runtimeKey, err = newRuntimeAccessKey()
		if err != nil {
			return nil, err
		}
		if err := AppContainer.AppRuntime.SetAccessKey(p.Context, userID, project.ID, runtimeKey); err != nil {
			return nil, err
		}
	}
	var document string
	var changes []aistudio.FileChange
	schemaVersion := "2.0"
	switch projectType {
	case aistudio.ProjectTypeWebApp:
		changes, err = appbuilder.StarterChanges()
		if err == nil {
			for i := range changes {
				if changes[i].Path == "src/runtime/project.ts" {
					changes[i].Content = fmt.Sprintf("export const runtimeProjectId = %q;\nexport const runtimeAccessKey = %q;\n", project.ID, runtimeKey)
				}
			}
		}
		schemaVersion = "1.0"
		document = `{"schemaVersion":"1.0","name":"Starter app","mode":"website_plus_app","theme":{"primary":"#7c3aed","background":"#080b12"},"routes":[{"id":"route-home","path":"/","name":"Home","protected":false}],"navigation":{"items":[{"label":"Home","path":"/"}]},"entities":[],"workflows":[],"assets":[],"seo":{},"permissions":{}}`
	case aistudio.ProjectTypePitchDeck:
		doc := deckstudio.Document{SchemaVersion: deckstudio.SchemaVersion, Title: project.Name, Template: "modern-dark", Theme: deckstudio.DefaultTheme("modern-dark"), Slides: []deckstudio.Slide{{ID: "slide-cover", Type: "cover", Title: project.Name, Background: deckstudio.Background{Type: "solid", Color: "#080b12"}, Elements: []deckstudio.Element{}, Notes: "", Order: 0}}}
		b, _ := json.Marshal(doc)
		document = string(b)
	case aistudio.ProjectTypeBusinessPlan:
		doc := planstudio.Document{SchemaVersion: planstudio.SchemaVersion, Title: project.Name + " Business Plan", Metadata: planstudio.Metadata{BusinessID: project.BusinessID, VersionLabel: "1.0", Currency: "GHS", PreparedAt: time.Now().UTC().Format(time.RFC3339)}, Sections: []planstudio.Section{{ID: "executive-summary", Title: "Executive Summary", Order: 0, Blocks: []planstudio.Block{{ID: "executive-summary-text", Type: "paragraph", Text: "Use AI or start writing your verified business summary."}}}}}
		b, _ := json.Marshal(doc)
		document = string(b)
	default:
		return nil, errors.New("unsupported project type")
	}
	if err != nil {
		return nil, err
	}
	revision, err := AppContainer.AIStudioRepo.CreateRevision(p.Context, aistudio.RevisionInput{ProjectID: project.ID, UserID: userID, Source: "migration", Summary: "Initialize AI Studio project", SchemaVersion: schemaVersion, Document: document, Files: changes})
	if err != nil {
		return nil, err
	}
	approved, err := approveRevisionAndSync(p.Context, userID, revision.ID)
	if err != nil {
		return nil, err
	}
	updateAIProjectUsage(p.Context, userID)
	return approved, nil
}

func approveRevisionAndSync(ctx context.Context, userID, revisionID string) (*aistudio.Project, error) {
	project, err := AppContainer.AIStudioRepo.ApproveRevision(ctx, userID, revisionID)
	if err != nil {
		return nil, err
	}
	if err := syncRuntimeRevision(ctx, userID, project.ID, revisionID); err != nil {
		return nil, err
	}
	return project, nil
}

func syncRuntimeRevision(ctx context.Context, userID, projectID, revisionID string) error {
	if AppContainer == nil || AppContainer.AppRuntime == nil {
		return errors.New("managed runtime unavailable")
	}
	project, err := AppContainer.AIStudioRepo.GetProject(ctx, userID, projectID)
	if err != nil || project == nil {
		return err
	}
	if project.ProjectType != aistudio.ProjectTypeWebApp {
		return nil
	}
	revision, err := AppContainer.AIStudioRepo.GetRevision(ctx, userID, revisionID)
	if err != nil || revision == nil {
		return err
	}
	spec, err := appbuilder.ParseAppSpec(revision.Document)
	if err != nil {
		return fmt.Errorf("approved AppSpec is invalid: %w", err)
	}
	return AppContainer.AppRuntime.SyncFromAppSpec(ctx, userID, projectID, *spec)
}

func newRuntimeAccessKey() (string, error) {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return hex.EncodeToString(value), nil
}

func createProjectJob(p graphql.ResolveParams, jobType string, request map[string]any) (interface{}, error) {
	userID, err := requireAIStudioUser(p)
	if err != nil {
		return nil, err
	}
	projectID := p.Args["projectId"].(string)
	project, err := AppContainer.AIStudioRepo.GetProject(p.Context, userID, projectID)
	if err != nil || project == nil {
		return nil, errors.New("project not found or access denied")
	}
	if err := enforceAIStudioJobQuota(p.Context, userID, jobType); err != nil {
		return nil, err
	}
	encoded, _ := json.Marshal(request)
	return AppContainer.AIJobRepo.Create(p.Context, aijobs.CreateInput{UserID: userID, BusinessID: project.BusinessID, ProjectID: project.ID, ArtifactType: project.ProjectType, JobType: jobType, Request: string(encoded), MaxAttempts: 3})
}

func enforceAIStudioJobQuota(ctx context.Context, userID, jobType string) error {
	if AppContainer == nil || AppContainer.SubscriptionRepo == nil || AppContainer.PlanEnforcer == nil {
		return nil
	}
	_, plan, err := AppContainer.SubscriptionRepo.GetUserSubscription(ctx, userID)
	if err != nil || plan == nil {
		return err
	}
	period := subscriptions.BillingPeriod(time.Now())
	if err := AppContainer.PlanEnforcer.CheckAIProjectStorage(ctx, userID, plan.Name, period); err != nil {
		return err
	}
	switch jobType {
	case "generate", "revise", "repair", "plan":
		return AppContainer.PlanEnforcer.CheckAITokenQuota(ctx, userID, plan.Name, period, 1)
	case "asset", "thumbnail":
		return AppContainer.PlanEnforcer.CheckAIStudioOperation(ctx, userID, plan.Name, period, "recraft_images")
	case "build":
		return AppContainer.PlanEnforcer.CheckAIStudioOperation(ctx, userID, plan.Name, period, "ai_builds")
	case "export":
		return AppContainer.PlanEnforcer.CheckAIStudioOperation(ctx, userID, plan.Name, period, "ai_exports")
	case "deploy":
		return AppContainer.PlanEnforcer.CheckAIStudioOperation(ctx, userID, plan.Name, period, "ai_deployments")
	default:
		return nil
	}
}

func enforceAIStudioStorageQuota(ctx context.Context, userID string) error {
	if AppContainer == nil || AppContainer.SubscriptionRepo == nil || AppContainer.PlanEnforcer == nil {
		return nil
	}
	_, plan, err := AppContainer.SubscriptionRepo.GetUserSubscription(ctx, userID)
	if err != nil || plan == nil {
		return err
	}
	return AppContainer.PlanEnforcer.CheckAIProjectStorage(ctx, userID, plan.Name, subscriptions.BillingPeriod(time.Now()))
}

func updateAIProjectUsage(ctx context.Context, userID string) {
	if AppContainer == nil || AppContainer.AIStudioRepo == nil || AppContainer.UsageRepo == nil {
		return
	}
	bytes, err := AppContainer.AIStudioRepo.UserProjectBytes(ctx, userID)
	if err != nil {
		return
	}
	_ = AppContainer.UsageRepo.UpdateAIProjectBytes(ctx, userID, subscriptions.BillingPeriod(time.Now()), bytes)
}

func stringArg(args map[string]interface{}, key string) string {
	if value, ok := args[key].(string); ok {
		return strings.TrimSpace(value)
	}
	return ""
}
func boolArg(args map[string]interface{}, key string) bool {
	value, _ := args[key].(bool)
	return value
}
func jsonRawOrObject(value string) any {
	if strings.TrimSpace(value) == "" {
		return map[string]any{}
	}
	var out any
	if json.Unmarshal([]byte(value), &out) == nil {
		return out
	}
	return map[string]any{}
}

func formatAIStudioTime(value time.Time) string { return value.UTC().Format(time.RFC3339Nano) }
func _unusedAIStudioFmt()                       { _ = fmt.Sprintf("") }
