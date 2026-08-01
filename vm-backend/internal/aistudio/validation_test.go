package aistudio

import (
	"strings"
	"testing"
)

func TestValidateProjectPath(t *testing.T) {
	t.Parallel()
	valid := []string{"src/App.tsx", "public/brand/logo.svg", "README.md", "src/components/Hero Section.tsx"}
	for _, input := range valid {
		input := input
		t.Run("valid_"+strings.ReplaceAll(input, "/", "_"), func(t *testing.T) {
			t.Parallel()
			got, err := ValidateProjectPath(input)
			if err != nil || got != input {
				t.Fatalf("ValidateProjectPath(%q) = %q, %v", input, got, err)
			}
		})
	}

	invalid := []string{"../secret", "/etc/passwd", "src//App.tsx", "src/../App.tsx", ".env", ".git/config", ".ssh/id_rsa", "node_modules/pkg/index.js", "src/$bad.ts"}
	for _, input := range invalid {
		input := input
		t.Run("invalid_"+strings.ReplaceAll(input, "/", "_"), func(t *testing.T) {
			t.Parallel()
			if _, err := ValidateProjectPath(input); err == nil {
				t.Fatalf("ValidateProjectPath(%q) unexpectedly succeeded", input)
			}
		})
	}
}

func TestValidateFileChangeHashesContent(t *testing.T) {
	t.Parallel()
	change := &FileChange{Path: "src/App.tsx", Operation: "create", Content: "export default function App() { return null }"}
	if err := ValidateFileChange(change); err != nil {
		t.Fatal(err)
	}
	if change.ContentHash != HashContent(change.Content) {
		t.Fatalf("unexpected content hash %q", change.ContentHash)
	}
	if change.Language != "" {
		t.Fatalf("validation must not silently overwrite explicitly managed language, got %q", change.Language)
	}
}

func TestValidateFileChangeRejectsOversizedContent(t *testing.T) {
	t.Parallel()
	change := &FileChange{Path: "src/huge.ts", Operation: "update", Content: strings.Repeat("x", MaxFileBytes+1)}
	if err := ValidateFileChange(change); err == nil {
		t.Fatal("expected oversized file to be rejected")
	}
}
