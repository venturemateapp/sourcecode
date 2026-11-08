package main

import (
	"context"
	"encoding/json"
	"fmt"
	"mime"
	"net"
	"net/http"
	"path"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/venturemate/vmbackend/internal/aistudio"
	"github.com/venturemate/vmbackend/internal/app"
	"github.com/venturemate/vmbackend/internal/buildworker"
)

func aiJobEventsHandler(container *app.Container) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		userID := strings.TrimSpace(r.Header.Get("X-User-ID"))
		jobID, ok := pathIdentifier(r.URL.Path, "/api/ai/jobs/", "/events")
		if !ok || userID == "" {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, `{"error":"streaming unavailable"}`, http.StatusInternalServerError)
			return
		}
		job, err := container.AIJobRepo.Get(r.Context(), userID, jobID)
		if err != nil || job == nil {
			http.Error(w, `{"error":"job not found"}`, http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache, no-transform")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")
		w.WriteHeader(http.StatusOK)

		lastEventID := strings.TrimSpace(r.Header.Get("Last-Event-ID"))
		writeJob := func() bool {
			current, getErr := container.AIJobRepo.Get(r.Context(), userID, jobID)
			if getErr != nil || current == nil {
				fmt.Fprintf(w, "event: error\ndata: {\"message\":\"job unavailable\"}\n\n")
				flusher.Flush()
				return false
			}
			eventID := fmt.Sprintf("%d", current.UpdatedAt.UnixNano())
			if eventID != lastEventID {
				payload, _ := json.Marshal(current)
				fmt.Fprintf(w, "id: %s\nevent: job\ndata: %s\n\n", eventID, payload)
				flusher.Flush()
				lastEventID = eventID
			}
			switch current.Status {
			case "completed", "failed", "cancelled", "awaiting_review":
				return false
			default:
				return true
			}
		}
		if !writeJob() {
			return
		}
		poll := time.NewTicker(time.Second)
		heartbeat := time.NewTicker(15 * time.Second)
		defer poll.Stop()
		defer heartbeat.Stop()
		for {
			select {
			case <-r.Context().Done():
				return
			case <-heartbeat.C:
				fmt.Fprint(w, ": heartbeat\n\n")
				flusher.Flush()
			case <-poll.C:
				if !writeJob() {
					return
				}
			}
		}
	}
}

func aiProjectSourceHandler(container *app.Container) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		userID := strings.TrimSpace(r.Header.Get("X-User-ID"))
		projectID, ok := pathIdentifier(r.URL.Path, "/api/ai/projects/", "/source.zip")
		if !ok || userID == "" {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		project, err := container.AIStudioRepo.GetProject(r.Context(), userID, projectID)
		if err != nil || project == nil {
			http.Error(w, `{"error":"project not found"}`, http.StatusNotFound)
			return
		}
		revisionID := strings.TrimSpace(r.URL.Query().Get("revisionId"))
		files, err := container.AIStudioRepo.ResolveFilesAtRevision(r.Context(), userID, projectID, revisionID)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":%q}`, err.Error()), http.StatusBadRequest)
			return
		}
		archive, err := buildworker.SourceZip(files)
		if err != nil {
			http.Error(w, fmt.Sprintf(`{"error":%q}`, err.Error()), http.StatusInternalServerError)
			return
		}
		filename := project.Slug + "-source.zip"
		w.Header().Set("Content-Type", "application/zip")
		w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": filename}))
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(archive)))
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(archive)
	}
}

func aiBuildDownloadHandler(container *app.Container) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}
		userID := strings.TrimSpace(r.Header.Get("X-User-ID"))
		buildID, ok := pathIdentifier(r.URL.Path, "/api/ai/builds/", "/download")
		if !ok || userID == "" {
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}
		build, err := container.AIStudioRepo.GetBuild(r.Context(), userID, buildID)
		if err != nil || build == nil || build.Status != "completed" || build.ArtifactStorageKey == "" {
			http.Error(w, `{"error":"build artifact not found"}`, http.StatusNotFound)
			return
		}
		signedURL, err := container.S3.SignedDownloadURL(r.Context(), build.ArtifactStorageKey, 10*time.Minute)
		if err != nil {
			http.Error(w, `{"error":"could not authorize download"}`, http.StatusInternalServerError)
			return
		}
		http.Redirect(w, r, signedURL, http.StatusTemporaryRedirect)
	}
}

func aiPreviewHandler(container *app.Container) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		projectID, revisionID, filePath, ok := parseAIPreviewPath(r.URL.Path)
		if !ok {
			http.NotFound(w, r)
			return
		}
		available, err := container.AIStudioRepo.HasCompletedPreview(r.Context(), projectID, revisionID)
		if err != nil || !available {
			http.NotFound(w, r)
			return
		}
		key := path.Join("ai-studio", projectID, "previews", revisionID, filePath)
		data, contentType, err := container.S3.Download(r.Context(), key)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		if contentType == "" || contentType == "application/octet-stream" {
			if detected := mime.TypeByExtension(path.Ext(filePath)); detected != "" {
				contentType = detected
			}
		}
		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
		w.Header().Set("Cache-Control", "public, max-age=60")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Cross-Origin-Resource-Policy", "cross-origin")
		w.Header().Set("Content-Security-Policy", "sandbox allow-scripts allow-forms allow-popups allow-modals; default-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https:")
		if r.Method == http.MethodHead {
			return
		}
		_, _ = w.Write(data)
	}
}

var previewSubdomainPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$`)

var reservedPreviewSubdomains = map[string]struct{}{
	"admin": {}, "api": {}, "app": {}, "auth": {}, "blog": {}, "cdn": {}, "dashboard": {},
	"docs": {}, "help": {}, "mail": {}, "sites": {}, "smtp": {}, "status": {}, "support": {},
	"www": {}, "venturemate": {}, "assets": {}, "static": {}, "graphql": {}, "billing": {},
}

func aiPreviewBusinessSlug(host, baseDomain string) (string, bool) {
	host = strings.TrimSpace(strings.ToLower(host))
	if parsedHost, _, err := net.SplitHostPort(host); err == nil {
		host = parsedHost
	}
	host = strings.TrimSuffix(host, ".")
	baseDomain = strings.TrimSuffix(strings.ToLower(strings.TrimSpace(baseDomain)), ".")
	suffix := "." + baseDomain
	if baseDomain == "" || !strings.HasSuffix(host, suffix) {
		return "", false
	}
	slug := strings.TrimSuffix(host, suffix)
	if strings.Contains(slug, ".") || !previewSubdomainPattern.MatchString(slug) {
		return "", false
	}
	if _, reserved := reservedPreviewSubdomains[slug]; reserved {
		return "", false
	}
	return slug, true
}

func aiPreviewBusinessAllowed(ctx context.Context, container *app.Container, host, baseDomain string) bool {
	slug, ok := aiPreviewBusinessSlug(host, baseDomain)
	if !ok {
		return false
	}
	target, err := container.AIStudioRepo.GetPreviewByBusinessSlug(ctx, slug)
	return err == nil && target != nil
}

func aiPreviewBusinessHostHandler(container *app.Container, baseDomain string, fallback http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slug, ok := aiPreviewBusinessSlug(r.Host, baseDomain)
		if !ok {
			fallback.ServeHTTP(w, r)
			return
		}
		if site, err := container.WebsiteRepo.GetPublishedByHost(r.Context(), r.Host, baseDomain); err == nil && site != nil {
			fallback.ServeHTTP(w, r)
			return
		}
		target, err := container.AIStudioRepo.GetPreviewByBusinessSlug(r.Context(), slug)
		if err != nil || target == nil {
			fallback.ServeHTTP(w, r)
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		filePath := strings.Trim(strings.TrimPrefix(r.URL.Path, "/"), "/")
		if filePath == "" {
			filePath = "index.html"
		}
		filePath, err = aistudio.ValidateProjectPath(filePath)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		key := path.Join("ai-studio", target.ProjectID, "previews", target.RevisionID, filePath)
		data, contentType, err := container.S3.Download(r.Context(), key)
		if err != nil && path.Ext(filePath) == "" {
			filePath = "index.html"
			key = path.Join("ai-studio", target.ProjectID, "previews", target.RevisionID, "index.html")
			data, contentType, err = container.S3.Download(r.Context(), key)
		}
		if err != nil {
			http.NotFound(w, r)
			return
		}
		if contentType == "" || contentType == "application/octet-stream" {
			if detected := mime.TypeByExtension(path.Ext(filePath)); detected != "" {
				contentType = detected
			}
		}
		w.Header().Set("Content-Type", contentType)
		w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
		w.Header().Set("Cache-Control", "public, max-age=60")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Cross-Origin-Resource-Policy", "cross-origin")
		w.Header().Set("Content-Security-Policy", fmt.Sprintf("sandbox allow-scripts allow-forms allow-popups allow-modals; default-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self' https://%s https://www.%s; base-uri 'self'; form-action 'self' https:", baseDomain, baseDomain))
		if r.Method == http.MethodHead {
			return
		}
		_, _ = w.Write(data)
	}
}

func parseAIPreviewPath(requestPath string) (string, string, string, bool) {
	const prefix = "/api/ai/previews/"
	if !strings.HasPrefix(requestPath, prefix) {
		return "", "", "", false
	}
	parts := strings.SplitN(strings.TrimPrefix(requestPath, prefix), "/", 3)
	if len(parts) != 3 || parts[2] == "" {
		return "", "", "", false
	}
	projectID, err := uuid.Parse(parts[0])
	if err != nil {
		return "", "", "", false
	}
	revisionID, err := uuid.Parse(parts[1])
	if err != nil {
		return "", "", "", false
	}
	filePath, err := aistudio.ValidateProjectPath(parts[2])
	if err != nil {
		return "", "", "", false
	}
	return projectID.String(), revisionID.String(), filePath, true
}

func pathIdentifier(value, prefix, suffix string) (string, bool) {
	if !strings.HasPrefix(value, prefix) || !strings.HasSuffix(value, suffix) {
		return "", false
	}
	identifier := strings.TrimSuffix(strings.TrimPrefix(value, prefix), suffix)
	identifier = strings.Trim(identifier, "/")
	if identifier == "" || strings.Contains(identifier, "/") || len(identifier) > 100 {
		return "", false
	}
	return identifier, true
}
