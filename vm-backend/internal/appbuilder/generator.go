package appbuilder

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"path"
	"sort"
	"strings"

	"github.com/venturemate/vmbackend/internal/ai"
	"github.com/venturemate/vmbackend/internal/aistudio"
	"github.com/venturemate/vmbackend/internal/businesses"
)

//go:embed templates/react-app-v1
var starterFS embed.FS

var ApprovedDependencies = map[string]bool{
	"@emotion/react": true, "@emotion/styled": true, "@mui/icons-material": true, "@mui/material": true,
	"@mui/x-date-pickers": true, "@tailwindcss/vite": true, "@types/aos": true, "@vitejs/plugin-react": true,
	"aos": true, "date-fns": true, "html2canvas": true, "jspdf": true, "lucide-react": true,
	"pptxgenjs": true, "react": true, "react-dom": true, "react-router-dom": true, "vite": true,
	"@eslint/js": true, "@types/node": true, "@types/react": true, "@types/react-dom": true,
	"autoprefixer": true, "eslint": true, "eslint-plugin-react-hooks": true, "eslint-plugin-react-refresh": true,
	"globals": true, "postcss": true, "tailwindcss": true, "typescript": true, "typescript-eslint": true,
}

type Replacement struct {
	Search     string `json:"search"`
	Replace    string `json:"replace"`
	Occurrence int    `json:"occurrence,omitempty"`
}

type FileOperation struct {
	Type         string        `json:"type"`
	Path         string        `json:"path"`
	PreviousPath string        `json:"previousPath,omitempty"`
	BaseHash     string        `json:"baseHash,omitempty"`
	Content      string        `json:"content,omitempty"`
	Replacements []Replacement `json:"replacements,omitempty"`
}

type AssetRequest struct {
	Kind    string `json:"kind"`
	Subject string `json:"subject"`
	Purpose string `json:"purpose"`
	Style   string `json:"style"`
	Size    string `json:"size"`
}

type GenerationResult struct {
	Summary        string           `json:"summary"`
	AppSpec        AppSpec          `json:"appSpec"`
	Operations     []FileOperation  `json:"operations"`
	AssetRequests  []AssetRequest   `json:"assetRequests"`
	SchemaChanges  []map[string]any `json:"schemaChanges"`
	ExpectedRoutes []string         `json:"expectedRoutes"`
}

func StarterFiles() ([]aistudio.ProjectFile, error) {
	var files []aistudio.ProjectFile
	err := fs.WalkDir(starterFS, "templates/react-app-v1", func(filePath string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			return nil
		}
		content, err := starterFS.ReadFile(filePath)
		if err != nil {
			return err
		}
		relative := strings.TrimPrefix(filePath, "templates/react-app-v1/")
		clean, err := aistudio.ValidateProjectPath(relative)
		if err != nil {
			return err
		}
		files = append(files, aistudio.ProjectFile{Path: clean, Language: aistudio.LanguageForPath(clean), CurrentContent: string(content), ContentHash: aistudio.HashContent(string(content)), SizeBytes: int64(len(content))})
		return nil
	})
	sort.Slice(files, func(i, j int) bool { return files[i].Path < files[j].Path })
	return files, err
}

func StarterChanges() ([]aistudio.FileChange, error) {
	files, err := StarterFiles()
	if err != nil {
		return nil, err
	}
	changes := make([]aistudio.FileChange, 0, len(files))
	for _, file := range files {
		changes = append(changes, aistudio.FileChange{Path: file.Path, Operation: "create", Content: file.CurrentContent, Language: file.Language})
	}
	return changes, nil
}

func ValidateManifest(content string) error {
	var manifest struct {
		Dependencies    map[string]string `json:"dependencies"`
		DevDependencies map[string]string `json:"devDependencies"`
		Scripts         map[string]string `json:"scripts"`
	}
	if err := json.Unmarshal([]byte(content), &manifest); err != nil {
		return fmt.Errorf("package.json is invalid: %w", err)
	}
	for name := range manifest.Dependencies {
		if !ApprovedDependencies[name] {
			return fmt.Errorf("dependency %s is not approved", name)
		}
	}
	for name := range manifest.DevDependencies {
		if !ApprovedDependencies[name] {
			return fmt.Errorf("development dependency %s is not approved", name)
		}
	}
	approvedScripts := map[string]map[string]bool{
		"dev":     {"vite": true, "vite --host": true},
		"build":   {"tsc -b && vite build": true, "tsc --noEmit && vite build": true, "vite build": true},
		"lint":    {"tsc --noEmit": true, "eslint .": true, "eslint src --max-warnings=0": true},
		"preview": {"vite preview": true, "vite preview --host": true},
		"start":   {"vite preview --host": true},
	}
	for name, command := range manifest.Scripts {
		allowedCommands, ok := approvedScripts[name]
		if !ok {
			return fmt.Errorf("script %s is not approved", name)
		}
		normalized := strings.Join(strings.Fields(command), " ")
		if !allowedCommands[normalized] {
			return fmt.Errorf("script %s must use an approved command", name)
		}
	}
	if strings.TrimSpace(manifest.Scripts["build"]) == "" {
		return errors.New("package.json must define a build script")
	}
	return nil
}

func Generate(ctx context.Context, provider ai.Provider, project *aistudio.Project, business *businesses.Business, prompt string, currentFiles []aistudio.ProjectFile) (*GenerationResult, []aistudio.FileChange, *ai.ProviderResponse, error) {
	if provider == nil {
		return nil, nil, nil, errors.New("AI provider is unavailable")
	}
	if project == nil {
		return nil, nil, nil, errors.New("project is required")
	}
	prompt = strings.TrimSpace(prompt)
	if prompt == "" {
		return nil, nil, nil, errors.New("generation prompt is required")
	}
	fileIndex := make(map[string]aistudio.ProjectFile, len(currentFiles))
	var contextBuilder strings.Builder
	contextBuilder.WriteString("CURRENT PROJECT FILES. Preserve files not explicitly changed.\n")
	for _, file := range currentFiles {
		fileIndex[file.Path] = file
		if file.Path == "package-lock.json" {
			contextBuilder.WriteString(fmt.Sprintf("- %s [%s] (lockfile omitted)\n", file.Path, file.ContentHash))
			continue
		}
		if len(file.CurrentContent) > 24000 {
			contextBuilder.WriteString(fmt.Sprintf("- %s [%s] (large file omitted)\n", file.Path, file.ContentHash))
			continue
		}
		contextBuilder.WriteString(fmt.Sprintf("\n--- %s [%s] ---\n%s\n", file.Path, file.ContentHash, file.CurrentContent))
	}
	businessContext := "No linked business context."
	if business != nil {
		businessContext = fmt.Sprintf("Business name: %s\nIndustry: %s\nStage: %s\nLocation: %s\nTagline: %s\nDescription: %s\nBrand kit JSON: %s\nVerified metrics JSON: %s",
			business.Name, business.Industry, business.Stage, business.Location, business.Tagline, business.Description, business.BrandKit, business.Metrics)
	}
	system := `You are VentureMate's production AI web-app engineer. Return exactly one JSON object and no markdown.
Create a responsive, accessible, truthful React + TypeScript + Vite application using only dependencies already present in package.json.
Never invent customers, testimonials, team members, revenue, traction, awards, addresses, market statistics, or historical financial results. Label generated future assumptions as projections.
Never include API keys or secrets. Generated apps must use src/runtime/client.ts for managed data. Do not add arbitrary packages.
Preserve every manual edit and every unrelated file. Use exact, reviewable file operations.
For update_file and delete_file, baseHash must equal the supplied file hash. Prefer exact replacements for small edits; each search must match exactly once.
Allowed operations: create_file, update_file, delete_file, move_file.
Every visible section/component must include a stable data-vm-node-id attribute.
Entity permissions default to public read only. For a deliberately public form or CRUD experience, explicitly set entity.permissions publicCreate/publicUpdate/publicDelete to true only as required.
Required JSON shape: {"summary":"...","appSpec":{"schemaVersion":"1.0","name":"...","mode":"marketing_website|functional_web_app|website_plus_app","theme":{},"routes":[],"navigation":{},"entities":[],"workflows":[],"assets":[],"seo":{},"permissions":{}},"operations":[{"type":"update_file","path":"src/App.tsx","baseHash":"sha256:...","replacements":[{"search":"exact","replace":"new"}]}],"assetRequests":[],"schemaChanges":[],"expectedRoutes":[]}.
Use create_file content for new files. A full content field may be used for an update only when necessary.`
	userMessage := fmt.Sprintf("PROJECT: %s (%s)\nBUSINESS CONTEXT:\n%s\n\nUSER REQUEST:\n%s\n\n%s", project.Name, project.ProjectType, businessContext, prompt, contextBuilder.String())
	response, err := provider.Chat(ctx, system, []ai.Message{{Role: "user", Content: userMessage}}, nil)
	if err != nil {
		return nil, nil, nil, err
	}
	raw := extractJSONObject(response.Content)
	var result GenerationResult
	decoder := json.NewDecoder(strings.NewReader(raw))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&result); err != nil {
		return nil, nil, response, fmt.Errorf("AI returned invalid structured app changes: %w", err)
	}
	if strings.TrimSpace(result.Summary) == "" {
		return nil, nil, response, errors.New("AI result is missing a summary")
	}
	if err := result.AppSpec.Validate(); err != nil {
		return nil, nil, response, fmt.Errorf("invalid AppSpec: %w", err)
	}
	changes, err := ApplyOperations(fileIndex, result.Operations)
	if err != nil {
		return nil, nil, response, err
	}
	return &result, changes, response, nil
}

func ApplyOperations(current map[string]aistudio.ProjectFile, operations []FileOperation) ([]aistudio.FileChange, error) {
	if len(operations) == 0 {
		return nil, errors.New("AI returned no file operations")
	}
	if len(operations) > 100 {
		return nil, errors.New("AI returned too many file operations")
	}
	working := make(map[string]aistudio.ProjectFile, len(current))
	for k, v := range current {
		working[k] = v
	}
	changes := make([]aistudio.FileChange, 0, len(operations))
	for index := range operations {
		op := &operations[index]
		op.Type = strings.ToLower(strings.TrimSpace(op.Type))
		clean, err := aistudio.ValidateProjectPath(op.Path)
		if err != nil {
			return nil, fmt.Errorf("operation %d path: %w", index+1, err)
		}
		op.Path = clean
		switch op.Type {
		case "create_file":
			if _, exists := working[op.Path]; exists {
				return nil, fmt.Errorf("cannot create existing file %s", op.Path)
			}
			change := aistudio.FileChange{Path: op.Path, Operation: "create", Content: op.Content, Language: aistudio.LanguageForPath(op.Path)}
			if err := aistudio.ValidateFileChange(&change); err != nil {
				return nil, err
			}
			if op.Path == "package.json" {
				if err := ValidateManifest(change.Content); err != nil {
					return nil, err
				}
			}
			working[op.Path] = aistudio.ProjectFile{Path: op.Path, CurrentContent: change.Content, ContentHash: change.ContentHash}
			changes = append(changes, change)
		case "update_file":
			file, exists := working[op.Path]
			if !exists {
				return nil, fmt.Errorf("cannot update missing file %s", op.Path)
			}
			if op.BaseHash == "" || op.BaseHash != file.ContentHash {
				return nil, fmt.Errorf("base hash conflict for %s", op.Path)
			}
			content := op.Content
			if len(op.Replacements) > 0 {
				content = file.CurrentContent
				for _, replacement := range op.Replacements {
					var replaceErr error
					content, replaceErr = exactReplace(content, replacement)
					if replaceErr != nil {
						return nil, fmt.Errorf("%s: %w", op.Path, replaceErr)
					}
				}
			} else if content == "" {
				return nil, fmt.Errorf("update for %s has no content or replacements", op.Path)
			}
			change := aistudio.FileChange{Path: op.Path, Operation: "update", Content: content, BaseHash: file.ContentHash, Language: aistudio.LanguageForPath(op.Path)}
			if err := aistudio.ValidateFileChange(&change); err != nil {
				return nil, err
			}
			if op.Path == "package.json" {
				if err := ValidateManifest(change.Content); err != nil {
					return nil, err
				}
			}
			working[op.Path] = aistudio.ProjectFile{Path: op.Path, CurrentContent: change.Content, ContentHash: change.ContentHash}
			changes = append(changes, change)
		case "delete_file":
			file, exists := working[op.Path]
			if !exists {
				return nil, fmt.Errorf("cannot delete missing file %s", op.Path)
			}
			if op.BaseHash == "" || op.BaseHash != file.ContentHash {
				return nil, fmt.Errorf("base hash conflict for %s", op.Path)
			}
			delete(working, op.Path)
			changes = append(changes, aistudio.FileChange{Path: op.Path, Operation: "delete", BaseHash: file.ContentHash})
		case "move_file":
			previous, err := aistudio.ValidateProjectPath(op.PreviousPath)
			if err != nil {
				return nil, fmt.Errorf("move source: %w", err)
			}
			file, exists := working[previous]
			if !exists {
				return nil, fmt.Errorf("cannot move missing file %s", previous)
			}
			if _, exists := working[op.Path]; exists {
				return nil, fmt.Errorf("move destination %s exists", op.Path)
			}
			if op.BaseHash == "" || op.BaseHash != file.ContentHash {
				return nil, fmt.Errorf("base hash conflict for %s", previous)
			}
			delete(working, previous)
			file.Path = op.Path
			working[op.Path] = file
			changes = append(changes, aistudio.FileChange{Path: op.Path, PreviousPath: previous, Operation: "move", BaseHash: file.ContentHash})
		default:
			return nil, fmt.Errorf("unsupported file operation %q", op.Type)
		}
	}
	return changes, nil
}

func exactReplace(content string, replacement Replacement) (string, error) {
	if replacement.Search == "" {
		return "", errors.New("replacement search cannot be empty")
	}
	count := strings.Count(content, replacement.Search)
	if replacement.Occurrence > 0 {
		if replacement.Occurrence > count {
			return "", fmt.Errorf("replacement occurrence %d not found", replacement.Occurrence)
		}
		start := 0
		for i := 1; i <= replacement.Occurrence; i++ {
			next := strings.Index(content[start:], replacement.Search)
			if next < 0 {
				return "", errors.New("replacement not found")
			}
			start += next
			if i < replacement.Occurrence {
				start += len(replacement.Search)
			}
		}
		return content[:start] + replacement.Replace + content[start+len(replacement.Search):], nil
	}
	if count != 1 {
		return "", fmt.Errorf("replacement search matched %d times; expected exactly once", count)
	}
	return strings.Replace(content, replacement.Search, replacement.Replace, 1), nil
}

func extractJSONObject(content string) string {
	content = strings.TrimSpace(content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	content = strings.TrimSpace(content)
	start, end := strings.Index(content, "{"), strings.LastIndex(content, "}")
	if start >= 0 && end > start {
		return content[start : end+1]
	}
	return content
}

func ProjectManifest(spec AppSpec, expectedRoutes []string, assetRequests []AssetRequest) string {
	manifest := map[string]any{"appSpec": spec, "expectedRoutes": expectedRoutes, "assetRequests": assetRequests, "templateVersion": "react-app-v1"}
	data, _ := json.Marshal(manifest)
	return string(data)
}

func BuildFileSummary(files []aistudio.ProjectFile) map[string]string {
	result := make(map[string]string, len(files))
	for _, file := range files {
		result[path.Clean(file.Path)] = file.ContentHash
	}
	return result
}
