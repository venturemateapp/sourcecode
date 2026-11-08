package buildworker

import (
	"archive/zip"
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/venturemate/vmbackend/internal/aistudio"
)

func TestBuildInstallsDevelopmentDependenciesForLintAndBuild(t *testing.T) {
	workspace := t.TempDir()
	logPath := filepath.Join(workspace, "npm-arguments.txt")
	toolPath := filepath.Join(workspace, "npm")
	tool := "#!/bin/sh\nprintf '%s\\n' \"$*\" >> '" + logPath + "'\nif [ \"$1 $2\" = \"run build\" ]; then mkdir -p dist; printf '<html></html>' > dist/index.html; fi\n"
	if err := os.WriteFile(toolPath, []byte(tool), 0o700); err != nil {
		t.Fatal(err)
	}
	files := []aistudio.ProjectFile{
		{Path: "package.json", CurrentContent: `{"name":"demo","dependencies":{},"devDependencies":{},"scripts":{"lint":"tsc --noEmit","build":"vite build"}}`},
		{Path: "package-lock.json", CurrentContent: `{"name":"demo","lockfileVersion":3,"packages":{}}`},
	}
	runner := &Runner{NPMPath: toolPath}
	if _, err := runner.Build(t.Context(), "project", "revision", files, nil); err != nil {
		t.Fatalf("build failed: %v", err)
	}
	arguments, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(arguments), "ci --include=dev") {
		t.Fatalf("dependency install omitted development packages: %s", arguments)
	}
}

func TestSourceZipUsesSafePaths(t *testing.T) {
	data, err := SourceZip([]aistudio.ProjectFile{{Path: "src/App.tsx", CurrentContent: "export default 1"}})
	if err != nil {
		t.Fatal(err)
	}
	reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		t.Fatal(err)
	}
	if len(reader.File) != 1 || reader.File[0].Name != "src/App.tsx" {
		t.Fatalf("unexpected archive")
	}
}

func TestSourceZipRejectsTraversal(t *testing.T) {
	if _, err := SourceZip([]aistudio.ProjectFile{{Path: "../secret", CurrentContent: "x"}}); err == nil {
		t.Fatal("expected traversal error")
	}
}
