package main

import (
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"strings"
	"time"

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
