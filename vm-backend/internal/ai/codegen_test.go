package ai

import (
	"strings"
	"testing"
)

func TestGenerateReactProjectKeepsAllSectionsOnOneRoute(t *testing.T) {
	raw := `{
		"name":"Acme",
		"pages":[{
			"id":"home","slug":"/","title":"Home","isHome":true,
			"sections":[
				{"id":"hero","type":"hero","order":0,"props":{"headline":"Build faster"}},
				{"id":"features","type":"features","order":1,"visible":true,"props":{"title":"Why Acme"}}
			]
		}],
		"globalStyles":{"primaryColor":"#123456"},
		"navigation":{"items":[{"label":"Home","href":"/"}]}
	}`

	result, err := GenerateReactProject(raw, "", "", "")
	if err != nil {
		t.Fatal(err)
	}
	app := projectFileContent(t, result, "src/App.jsx")
	if strings.Count(app, `"slug":"/"`) != 1 {
		t.Fatalf("home route must be emitted once:\n%s", app)
	}
	if !strings.Contains(app, `"type":"hero"`) || !strings.Contains(app, `"type":"features"`) {
		t.Fatalf("route does not contain every page section:\n%s", app)
	}
	if !strings.Contains(app, "s.visible !== false") {
		t.Fatal("sections with an omitted visible flag should remain visible")
	}
}

func TestGenerateReactProjectIncludesUsableResponsiveNavigationStyles(t *testing.T) {
	raw := `{"pages":[{"slug":"/","isHome":true,"sections":[]}]}`
	result, err := GenerateReactProject(raw, "Acme", "", "")
	if err != nil {
		t.Fatal(err)
	}
	css := projectFileContent(t, result, "src/styles/index.css")
	for _, expected := range []string{".header {", ".header-links {", ".nav-link {", "position: sticky", "@media (max-width: 768px)"} {
		if !strings.Contains(css, expected) {
			t.Errorf("generated CSS is missing %q", expected)
		}
	}
}

func TestGenerateReactProjectReturnsActionableDiagnostics(t *testing.T) {
	raw := `{"pages":[
		{"slug":"/about","sections":[{"type":"custom-widget","props":{}}]},
		{"slug":"/about","sections":[]}
	]}`
	result, err := GenerateReactProject(raw, "Acme", "", "")
	if err != nil {
		t.Fatal(err)
	}
	var duplicate, missingHome, unknown, empty bool
	for _, diagnostic := range result.Diagnostics {
		duplicate = duplicate || strings.Contains(diagnostic.Message, "Duplicate route")
		missingHome = missingHome || strings.Contains(diagnostic.Message, "home route")
		unknown = unknown || strings.Contains(diagnostic.Message, "Unknown section")
		empty = empty || strings.Contains(diagnostic.Message, "no sections")
	}
	if !duplicate || !missingHome || !unknown || !empty {
		t.Fatalf("incomplete diagnostics: %#v", result.Diagnostics)
	}
}

func projectFileContent(t *testing.T, result *CodeGenResult, path string) string {
	t.Helper()
	for _, file := range result.Files {
		if file.Path == path {
			return file.Content
		}
	}
	t.Fatalf("generated project is missing %s", path)
	return ""
}
