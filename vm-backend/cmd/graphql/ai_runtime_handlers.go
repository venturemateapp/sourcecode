package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/venturemate/vmbackend/internal/app"
)

const runtimeBodyLimit = 256 << 10

type runtimeRateWindow struct {
	Started time.Time
	Count   int
}

type runtimeRateLimiter struct {
	mu      sync.Mutex
	windows map[string]runtimeRateWindow
}

var managedRuntimeLimiter = &runtimeRateLimiter{windows: map[string]runtimeRateWindow{}}

func (l *runtimeRateLimiter) Allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	window := l.windows[key]
	if window.Started.IsZero() || now.Sub(window.Started) >= time.Minute {
		window = runtimeRateWindow{Started: now}
	}
	window.Count++
	l.windows[key] = window
	if len(l.windows) > 10000 {
		for candidate, value := range l.windows {
			if now.Sub(value.Started) > 2*time.Minute {
				delete(l.windows, candidate)
			}
		}
	}
	return window.Count <= 120
}

func aiRuntimeHandler(container *app.Container) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		projectID, entitySlug, recordID, ok := parseRuntimePath(r.URL.Path)
		if !ok {
			writeRuntimeError(w, http.StatusNotFound, "runtime route not found")
			return
		}
		clientKey := strings.TrimSpace(r.Header.Get("X-VM-Runtime-Key"))
		if !managedRuntimeLimiter.Allow(projectID + ":" + clientAddress(r)) {
			writeRuntimeError(w, http.StatusTooManyRequests, "runtime rate limit exceeded")
			return
		}
		if err := container.AppRuntime.Authorize(r.Context(), projectID, clientKey); err != nil {
			writeRuntimeError(w, http.StatusUnauthorized, "runtime authorization failed")
			return
		}
		switch r.Method {
		case http.MethodGet:
			if recordID != "" {
				writeRuntimeError(w, http.StatusMethodNotAllowed, "individual record reads are not enabled")
				return
			}
			limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
			offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
			items, total, err := container.AppRuntime.List(r.Context(), projectID, entitySlug, limit, offset)
			if err != nil {
				writeRuntimeError(w, http.StatusBadRequest, err.Error())
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"items": items, "total": total})
		case http.MethodPost:
			if recordID != "" {
				writeRuntimeError(w, http.StatusMethodNotAllowed, "cannot POST to an individual record")
				return
			}
			data, err := decodeRuntimeData(r)
			if err != nil {
				writeRuntimeError(w, http.StatusBadRequest, err.Error())
				return
			}
			record, err := container.AppRuntime.Create(r.Context(), projectID, entitySlug, data)
			if err != nil {
				writeRuntimeError(w, http.StatusBadRequest, err.Error())
				return
			}
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(record)
		case http.MethodPatch:
			if recordID == "" {
				writeRuntimeError(w, http.StatusBadRequest, "record id is required")
				return
			}
			data, err := decodeRuntimeData(r)
			if err != nil {
				writeRuntimeError(w, http.StatusBadRequest, err.Error())
				return
			}
			record, err := container.AppRuntime.Update(r.Context(), projectID, entitySlug, recordID, data)
			if err != nil {
				writeRuntimeError(w, http.StatusBadRequest, err.Error())
				return
			}
			_ = json.NewEncoder(w).Encode(record)
		case http.MethodDelete:
			if recordID == "" {
				writeRuntimeError(w, http.StatusBadRequest, "record id is required")
				return
			}
			if err := container.AppRuntime.Delete(r.Context(), projectID, entitySlug, recordID); err != nil {
				writeRuntimeError(w, http.StatusNotFound, err.Error())
				return
			}
			_ = json.NewEncoder(w).Encode(map[string]bool{"success": true})
		default:
			writeRuntimeError(w, http.StatusMethodNotAllowed, "method not allowed")
		}
	})
}

func parseRuntimePath(value string) (projectID, entitySlug, recordID string, ok bool) {
	segments := strings.Split(strings.Trim(value, "/"), "/")
	if len(segments) != 7 && len(segments) != 8 {
		return "", "", "", false
	}
	if segments[0] != "api" || segments[1] != "runtime" || segments[2] != "projects" || segments[4] != "entities" || segments[6] != "records" {
		return "", "", "", false
	}
	projectID, entitySlug = segments[3], segments[5]
	if len(segments) == 8 {
		recordID = segments[7]
	}
	if projectID == "" || entitySlug == "" || strings.ContainsAny(projectID+entitySlug+recordID, "\\\x00") {
		return "", "", "", false
	}
	return projectID, entitySlug, recordID, true
}

func decodeRuntimeData(r *http.Request) (map[string]any, error) {
	defer r.Body.Close()
	decoder := json.NewDecoder(io.LimitReader(r.Body, runtimeBodyLimit+1))
	decoder.DisallowUnknownFields()
	var body struct {
		Data map[string]any `json:"data"`
	}
	if err := decoder.Decode(&body); err != nil {
		return nil, fmt.Errorf("invalid request body: %w", err)
	}
	if body.Data == nil {
		return nil, fmt.Errorf("data object is required")
	}
	return body.Data, nil
}

func writeRuntimeError(w http.ResponseWriter, status int, message string) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"error": message, "status": status})
}

func clientAddress(r *http.Request) string {
	if forwarded := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0]); forwarded != "" {
		return forwarded
	}
	return r.RemoteAddr
}
