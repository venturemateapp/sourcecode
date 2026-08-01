package buildworker

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/venturemate/vmbackend/internal/aistudio"
	"github.com/venturemate/vmbackend/internal/appbuilder"
	"github.com/venturemate/vmbackend/internal/s3"
)

const (
	defaultBuildTimeout = 8 * time.Minute
	maxBuildLogBytes    = 512 << 10
	maxArtifactBytes    = 100 << 20
)

type Result struct {
	ArtifactKey string           `json:"artifactKey"`
	PreviewURL  string           `json:"previewUrl"`
	Logs        string           `json:"logs"`
	Diagnostics []map[string]any `json:"diagnostics"`
	Runtime     string           `json:"runtime"`
}

type Runner struct {
	Storage          *s3.Service
	Timeout          time.Duration
	NPMPath          string
	MaxLogBytes      int
	MaxArtifactBytes int64
}

func New(storage *s3.Service) *Runner {
	timeout := envDuration("AI_BUILD_TIMEOUT", defaultBuildTimeout)
	return &Runner{
		Storage:          storage,
		Timeout:          timeout,
		NPMPath:          envString("AI_BUILD_NPM_PATH", "npm"),
		MaxLogBytes:      envInt("AI_BUILD_MAX_LOG_BYTES", maxBuildLogBytes),
		MaxArtifactBytes: int64(envInt("AI_BUILD_MAX_ARTIFACT_BYTES", maxArtifactBytes)),
	}
}

func (r *Runner) Build(ctx context.Context, projectID, revisionID string, files []aistudio.ProjectFile, progress func(step, message string, percent int, logLine string) error) (*Result, error) {
	if len(files) == 0 {
		return nil, errors.New("project contains no files")
	}
	if r.Timeout <= 0 {
		r.Timeout = defaultBuildTimeout
	}
	if strings.TrimSpace(r.NPMPath) == "" {
		r.NPMPath = "npm"
	}
	buildCtx, cancel := context.WithTimeout(ctx, r.Timeout)
	defer cancel()

	workspace, err := os.MkdirTemp("", "venturemate-build-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(workspace)
	if progress != nil {
		_ = progress("materializing", "Preparing isolated project workspace", 10, "Created isolated workspace")
	}
	if err := materialize(workspace, files); err != nil {
		return nil, err
	}
	packageJSON, err := os.ReadFile(filepath.Join(workspace, "package.json"))
	if err != nil {
		return nil, errors.New("project is missing package.json")
	}
	if err := appbuilder.ValidateManifest(string(packageJSON)); err != nil {
		return nil, err
	}
	if _, err := os.Stat(filepath.Join(workspace, "package-lock.json")); err != nil {
		return nil, errors.New("project is missing package-lock.json; deterministic builds require a lockfile")
	}

	var logs bytes.Buffer
	run := func(percent int, step, message string, timeout time.Duration, args ...string) error {
		if progress != nil {
			_ = progress(step, message, percent, strings.Join(append([]string{r.NPMPath}, args...), " "))
		}
		commandCtx := buildCtx
		var commandCancel context.CancelFunc
		if timeout > 0 {
			commandCtx, commandCancel = context.WithTimeout(buildCtx, timeout)
			defer commandCancel()
		}
		cmd := exec.CommandContext(commandCtx, r.NPMPath, args...)
		cmd.Dir = workspace
		cmd.Env = append(filteredEnvironment(os.Environ()), "CI=true", "NPM_CONFIG_AUDIT=false", "NPM_CONFIG_FUND=false", "NODE_ENV=production")
		writer := &limitedWriter{Writer: &logs, Limit: r.MaxLogBytes}
		cmd.Stdout, cmd.Stderr = writer, writer
		if err := cmd.Run(); err != nil {
			if errors.Is(commandCtx.Err(), context.DeadlineExceeded) {
				return fmt.Errorf("%s timed out", step)
			}
			return fmt.Errorf("%s failed: %w", step, err)
		}
		return nil
	}
	if err := run(25, "installing", "Installing locked dependencies", 4*time.Minute, "ci", "--ignore-scripts", "--no-audit", "--no-fund"); err != nil {
		return failedResult(logs.String(), stepDiagnostic("install", err)), err
	}
	if err := run(50, "linting", "Checking generated source", 2*time.Minute, "run", "lint"); err != nil {
		return failedResult(logs.String(), stepDiagnostic("lint", err)), err
	}
	if err := run(70, "building", "Creating production bundle", 3*time.Minute, "run", "build"); err != nil {
		return failedResult(logs.String(), stepDiagnostic("build", err)), err
	}
	distPath := filepath.Join(workspace, "dist")
	if stat, err := os.Stat(distPath); err != nil || !stat.IsDir() {
		return failedResult(logs.String(), stepDiagnostic("build", errors.New("build produced no dist directory"))), errors.New("build produced no dist directory")
	}
	if progress != nil {
		_ = progress("packaging", "Packaging build artifact", 88, "Packaging dist directory")
	}
	artifact, err := zipDirectory(distPath, r.MaxArtifactBytes)
	if err != nil {
		return nil, err
	}
	key := s3.GenerateKey(filepath.Join("ai-studio", projectID, "builds"), revisionID+".zip")
	previewURL := ""
	if r.Storage != nil {
		if _, err = r.Storage.Upload(buildCtx, key, artifact, "application/zip"); err != nil {
			return nil, err
		}
		previewPrefix := filepath.ToSlash(filepath.Join("ai-studio", projectID, "previews", revisionID))
		previewURL, err = uploadStaticDirectory(buildCtx, r.Storage, distPath, previewPrefix)
		if err != nil {
			return nil, err
		}
	}
	if progress != nil {
		_ = progress("completed", "Production build completed", 100, fmt.Sprintf("Artifact size: %d bytes", len(artifact)))
	}
	return &Result{ArtifactKey: key, PreviewURL: previewURL, Logs: logs.String(), Diagnostics: []map[string]any{}, Runtime: runtime.Version()}, nil
}

func uploadStaticDirectory(ctx context.Context, storage *s3.Service, root, prefix string) (string, error) {
	var indexURL string
	err := filepath.WalkDir(root, func(filePath string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			return nil
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() || info.Mode()&os.ModeSymlink != 0 {
			return errors.New("preview contains unsupported file type")
		}
		relative, err := filepath.Rel(root, filePath)
		if err != nil {
			return err
		}
		data, err := os.ReadFile(filePath)
		if err != nil {
			return err
		}
		key := filepath.ToSlash(filepath.Join(prefix, relative))
		contentType := mime.TypeByExtension(strings.ToLower(filepath.Ext(relative)))
		if contentType == "" {
			contentType = http.DetectContentType(data)
		}
		url, err := storage.Upload(ctx, key, data, contentType)
		if err != nil {
			return err
		}
		if filepath.ToSlash(relative) == "index.html" {
			indexURL = url
		}
		return nil
	})
	if err != nil {
		return "", err
	}
	if indexURL == "" {
		return "", errors.New("preview build is missing index.html")
	}
	return indexURL, nil
}

func SourceZip(files []aistudio.ProjectFile) ([]byte, error) {
	var output bytes.Buffer
	archive := zip.NewWriter(&output)
	for _, file := range files {
		clean, err := aistudio.ValidateProjectPath(file.Path)
		if err != nil {
			return nil, err
		}
		header := &zip.FileHeader{Name: clean, Method: zip.Deflate}
		header.SetMode(0o644)
		writer, err := archive.CreateHeader(header)
		if err != nil {
			return nil, err
		}
		if _, err := io.WriteString(writer, file.CurrentContent); err != nil {
			return nil, err
		}
		if output.Len() > maxArtifactBytes {
			return nil, errors.New("source archive exceeds maximum size")
		}
	}
	if err := archive.Close(); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func materialize(root string, files []aistudio.ProjectFile) error {
	var total int64
	for _, file := range files {
		clean, err := aistudio.ValidateProjectPath(file.Path)
		if err != nil {
			return err
		}
		total += int64(len(file.CurrentContent))
		if total > aistudio.MaxProjectBytes {
			return errors.New("project exceeds build size limit")
		}
		target := filepath.Join(root, filepath.FromSlash(clean))
		resolvedRoot, _ := filepath.Abs(root)
		resolvedTarget, _ := filepath.Abs(target)
		if !strings.HasPrefix(resolvedTarget, resolvedRoot+string(os.PathSeparator)) {
			return errors.New("project path escapes build workspace")
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(target, []byte(file.CurrentContent), 0o644); err != nil {
			return err
		}
	}
	return nil
}

func zipDirectory(root string, limit int64) ([]byte, error) {
	var output bytes.Buffer
	archive := zip.NewWriter(&output)
	err := filepath.WalkDir(root, func(filePath string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			return nil
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		if info.Mode()&os.ModeSymlink != 0 || !info.Mode().IsRegular() {
			return errors.New("build artifact contains unsupported file type")
		}
		relative, err := filepath.Rel(root, filePath)
		if err != nil {
			return err
		}
		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}
		header.Name = filepath.ToSlash(relative)
		header.Method = zip.Deflate
		writer, err := archive.CreateHeader(header)
		if err != nil {
			return err
		}
		input, err := os.Open(filePath)
		if err != nil {
			return err
		}
		_, copyErr := io.Copy(writer, input)
		closeErr := input.Close()
		if copyErr != nil {
			return copyErr
		}
		if closeErr != nil {
			return closeErr
		}
		if int64(output.Len()) > limit {
			return errors.New("build artifact exceeds maximum size")
		}
		return nil
	})
	if err != nil {
		_ = archive.Close()
		return nil, err
	}
	if err := archive.Close(); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func envString(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(os.Getenv(key)))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	duration, err := time.ParseDuration(value)
	if err != nil || duration <= 0 {
		return fallback
	}
	return duration
}

func filteredEnvironment(values []string) []string {
	blockedPrefixes := []string{"DEEPSEEK_", "OPENAI_", "CLAUDE_", "GEMINI_", "GROK_", "RECRAFT_", "AWS_", "S3_", "DATABASE_URL=", "DB_PASSWORD=", "JWT_SECRET="}
	output := make([]string, 0, len(values))
	for _, value := range values {
		blocked := false
		for _, prefix := range blockedPrefixes {
			if strings.HasPrefix(value, prefix) {
				blocked = true
				break
			}
		}
		if !blocked {
			output = append(output, value)
		}
	}
	return output
}

type limitedWriter struct {
	Writer io.Writer
	Limit  int
	wrote  int
}

func (w *limitedWriter) Write(p []byte) (int, error) {
	original := len(p)
	remaining := w.Limit - w.wrote
	if remaining > 0 {
		if len(p) > remaining {
			p = p[:remaining]
		}
		n, err := w.Writer.Write(p)
		w.wrote += n
		if err != nil {
			return n, err
		}
	}
	return original, nil
}

func failedResult(logs string, diagnostic map[string]any) *Result {
	return &Result{Logs: logs, Diagnostics: []map[string]any{diagnostic}, Runtime: runtime.Version()}
}

func stepDiagnostic(step string, err error) map[string]any {
	return map[string]any{"severity": "error", "step": step, "message": err.Error()}
}

func DiagnosticsJSON(result *Result) string {
	if result == nil {
		return "{}"
	}
	value, _ := json.Marshal(map[string]any{"items": result.Diagnostics})
	return string(value)
}
