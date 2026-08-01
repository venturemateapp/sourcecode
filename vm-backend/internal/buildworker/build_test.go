package buildworker

import (
	"archive/zip"
	"bytes"
	"testing"

	"github.com/venturemate/vmbackend/internal/aistudio"
)

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
