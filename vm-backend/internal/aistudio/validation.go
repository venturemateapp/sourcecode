package aistudio

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"regexp"
	"strings"
)

const (
	MaxProjectFiles = 500
	MaxFileBytes    = 2 << 20
	MaxProjectBytes = 40 << 20
)

var safePathSegment = regexp.MustCompile(`^[A-Za-z0-9@._+\- ]+$`)

var blockedPaths = map[string]struct{}{
	".env": {}, ".env.local": {}, ".env.production": {}, ".npmrc": {},
	"id_rsa": {}, "id_ed25519": {}, "credentials.json": {},
}

func HashContent(content string) string {
	sum := sha256.Sum256([]byte(content))
	return "sha256:" + hex.EncodeToString(sum[:])
}

func NormalizeJSON(value, fallback string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		value = fallback
	}
	if !json.Valid([]byte(value)) {
		return "", errors.New("invalid JSON")
	}
	return value, nil
}

func ValidateProjectType(value string) error {
	switch value {
	case ProjectTypeWebApp, ProjectTypePitchDeck, ProjectTypeBusinessPlan:
		return nil
	default:
		return fmt.Errorf("unsupported project type %q", value)
	}
}

func ValidateProjectPath(raw string) (string, error) {
	raw = strings.TrimSpace(strings.ReplaceAll(raw, "\\", "/"))
	if raw == "" || strings.HasPrefix(raw, "/") || strings.Contains(raw, "\x00") {
		return "", errors.New("project path must be relative")
	}
	clean := path.Clean(raw)
	if clean == "." || clean == ".." || strings.HasPrefix(clean, "../") || clean != raw {
		return "", errors.New("project path contains unsafe traversal or normalization")
	}
	if len(clean) > 300 {
		return "", errors.New("project path is too long")
	}
	parts := strings.Split(clean, "/")
	for _, part := range parts {
		if part == "" || part == "." || part == ".." || !safePathSegment.MatchString(part) {
			return "", fmt.Errorf("unsafe project path segment %q", part)
		}
		lower := strings.ToLower(part)
		if _, blocked := blockedPaths[lower]; blocked {
			return "", fmt.Errorf("secret file %q is not allowed", part)
		}
		if strings.HasPrefix(lower, ".git") || strings.HasPrefix(lower, ".ssh") {
			return "", fmt.Errorf("hidden system path %q is not allowed", part)
		}
	}
	if len([]byte(clean)) > 0 && strings.Contains(strings.ToLower(clean), "node_modules/") {
		return "", errors.New("node_modules content cannot be stored in a project")
	}
	return clean, nil
}

func ValidateFileChange(change *FileChange) error {
	if change == nil {
		return errors.New("file change is required")
	}
	clean, err := ValidateProjectPath(change.Path)
	if err != nil {
		return err
	}
	change.Path = clean
	change.Operation = strings.ToLower(strings.TrimSpace(change.Operation))
	switch change.Operation {
	case "create", "update", "delete", "move":
	default:
		return fmt.Errorf("unsupported file operation %q", change.Operation)
	}
	if change.Operation == "move" {
		previous, err := ValidateProjectPath(change.PreviousPath)
		if err != nil {
			return fmt.Errorf("invalid previous path: %w", err)
		}
		if previous == clean {
			return errors.New("move source and destination are identical")
		}
		change.PreviousPath = previous
	}
	if len([]byte(change.Content)) > MaxFileBytes {
		return fmt.Errorf("%s exceeds the %d byte file limit", clean, MaxFileBytes)
	}
	if change.Operation != "delete" {
		change.ContentHash = HashContent(change.Content)
	}
	return nil
}

func LanguageForPath(p string) string {
	ext := strings.ToLower(path.Ext(p))
	switch ext {
	case ".ts", ".tsx":
		return "typescript"
	case ".js", ".jsx", ".mjs":
		return "javascript"
	case ".json":
		return "json"
	case ".css", ".scss":
		return "css"
	case ".html":
		return "html"
	case ".md":
		return "markdown"
	case ".go":
		return "go"
	case ".sql":
		return "sql"
	default:
		return "text"
	}
}
