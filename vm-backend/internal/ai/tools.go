package ai

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/venturemate/vmbackend/internal/businesses"
)

type ToolFunc func(ctx context.Context, userID string, args map[string]interface{}) (string, error)

type Tool struct {
	Def    ToolDef
	Exec   ToolFunc
}

type ToolRegistry struct {
	tools map[string]Tool
}

func NewToolRegistry(bizRepo *businesses.Repository, fh *FileHandler) *ToolRegistry {
	tr := &ToolRegistry{tools: make(map[string]Tool)}
	tr.register(getBusinessInfoTool(bizRepo))
	tr.register(updateBusinessFieldTool(bizRepo))
	tr.register(listBusinessesTool(bizRepo))
	if fh != nil {
		tr.register(uploadDocumentTool(fh))
		tr.register(analyzeDocumentTool(fh))
		tr.register(deleteDocumentTool(fh))
	}
	return tr
}

func (tr *ToolRegistry) register(t Tool) {
	tr.tools[t.Def.Name] = t
}

func (tr *ToolRegistry) GetDefs() []ToolDef {
	var defs []ToolDef
	for _, t := range tr.tools {
		defs = append(defs, t.Def)
	}
	return defs
}

func (tr *ToolRegistry) Execute(ctx context.Context, userID string, call ToolCall) (string, error) {
	t, ok := tr.tools[call.Name]
	if !ok {
		return "", fmt.Errorf("unknown tool: %s", call.Name)
	}
	return t.Exec(ctx, userID, call.Args)
}

func getBusinessInfoTool(repo *businesses.Repository) Tool {
	return Tool{
		Def: ToolDef{
			Name:        "getBusinessInfo",
			Description: "Get detailed information about a business. Returns all fields including name, description, industry, stage, etc.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"businessId": {"type": "string", "description": "The ID of the business"}
				},
				"required": ["businessId"]
			}`),
		},
		Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
			bizID, _ := args["businessId"].(string)
			if bizID == "" {
				return `{"error": "businessId is required"}`, nil
			}
			biz, err := repo.GetByIDAndUser(ctx, bizID, userID)
			if err != nil {
				return fmt.Sprintf(`{"error": "business not found: %s"}`, err.Error()), nil
			}
			b, _ := json.Marshal(biz)
			return string(b), nil
		},
	}
}

func updateBusinessFieldTool(repo *businesses.Repository) Tool {
	return Tool{
		Def: ToolDef{
			Name:        "updateBusinessField",
			Description: "Update a specific field on a business. Fields: name, tagline, description, industry, stage, location, website, brandKit, pitchDeck, businessPlan, milestones, team, documents, financials, metrics, aiGenerated.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"businessId": {"type": "string", "description": "The ID of the business"},
					"field": {"type": "string", "description": "The field name to update"},
					"value": {"type": "string", "description": "The new value for the field"}
				},
				"required": ["businessId", "field", "value"]
			}`),
		},
		Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
			bizID, _ := args["businessId"].(string)
			field, _ := args["field"].(string)
			value, _ := args["value"].(string)
			if bizID == "" || field == "" {
				return `{"error": "businessId and field are required"}`, nil
			}
			biz, err := repo.GetByIDAndUser(ctx, bizID, userID)
			if err != nil {
				return fmt.Sprintf(`{"error": "business not found: %s"}`, err.Error()), nil
			}
			switch field {
			case "name":
				biz.Name = value
			case "tagline":
				biz.Tagline = value
			case "description":
				biz.Description = value
			case "industry":
				biz.Industry = value
			case "stage":
				biz.Stage = value
			case "location":
				biz.Location = value
			case "website":
				biz.Website = value
			case "brandKit":
				biz.BrandKit = value
			case "pitchDeck":
				biz.PitchDeck = value
			case "businessPlan":
				biz.BusinessPlan = value
			case "milestones":
				biz.Milestones = value
			case "team":
				biz.Team = value
			case "documents":
				biz.Documents = value
			case "financials":
				biz.Financials = value
			case "metrics":
				biz.Metrics = value
			case "aiGenerated":
				biz.AIGenerated = value
			default:
				return fmt.Sprintf(`{"error": "unknown field: %s"}`, field), nil
			}
			if err := repo.Update(ctx, biz); err != nil {
				return fmt.Sprintf(`{"error": "update failed: %s"}`, err.Error()), nil
			}
			return fmt.Sprintf(`{"success": true, "field": "%s", "message": "Field updated successfully"}`, field), nil
		},
	}
}

func listBusinessesTool(repo *businesses.Repository) Tool {
	return Tool{
		Def: ToolDef{
			Name:        "listBusinesses",
			Description: "List all businesses belonging to the current user.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {}
			}`),
		},
		Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
			list, err := repo.ListByUser(ctx, userID)
			if err != nil {
				return fmt.Sprintf(`{"error": "failed to list businesses: %s"}`, err.Error()), nil
			}
			type brief struct {
				ID       string `json:"id"`
				Name     string `json:"name"`
				Industry string `json:"industry"`
				Stage    string `json:"stage"`
			}
			var briefs []brief
			for _, b := range list {
				briefs = append(briefs, brief{ID: b.ID, Name: b.Name, Industry: b.Industry, Stage: b.Stage})
			}
			b, _ := json.Marshal(briefs)
			return string(b), nil
		},
	}
}

func uploadDocumentTool(fh *FileHandler) Tool {
	return Tool{
		Def: ToolDef{
			Name:        "uploadDocument",
			Description: "Upload a document to the business. Provide file data as base64, filename, category (legal/financial/marketing/product/hr/other), and optional comma-separated tags.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"businessId": {"type": "string", "description": "The ID of the business"},
					"fileName": {"type": "string", "description": "The filename including extension"},
					"fileDataBase64": {"type": "string", "description": "The file content encoded as base64"},
					"category": {"type": "string", "description": "Document category: legal, financial, marketing, product, hr, other"},
					"tags": {"type": "string", "description": "Optional comma-separated tags"}
				},
				"required": ["businessId", "fileName", "fileDataBase64"]
			}`),
		},
		Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
			bizID, _ := args["businessId"].(string)
			fileName, _ := args["fileName"].(string)
			b64data, _ := args["fileDataBase64"].(string)
			category, _ := args["category"].(string)
			tagsStr, _ := args["tags"].(string)

			if bizID == "" || fileName == "" || b64data == "" {
				return `{"error": "businessId, fileName, and fileDataBase64 are required"}`, nil
			}
			if category == "" {
				category = "other"
			}

			var tags []string
			if tagsStr != "" {
				tags = splitAndTrim(tagsStr, ",")
			}

			fileData, err := base64.StdEncoding.DecodeString(b64data)
			if err != nil {
				return fmt.Sprintf(`{"error": "invalid base64 data: %s"}`, err.Error()), nil
			}

			doc, err := fh.ProcessUpload(ctx, fileData, fileName, category, tags, bizID, userID)
			if err != nil {
				return fmt.Sprintf(`{"error": "upload failed: %s"}`, err.Error()), nil
			}

			docJSON, _ := json.Marshal(doc)
			return fmt.Sprintf(`{"success": true, "document": %s}`, string(docJSON)), nil
		},
	}
}

func analyzeDocumentTool(fh *FileHandler) Tool {
	return Tool{
		Def: ToolDef{
			Name:        "analyzeDocument",
			Description: "Analyze a document that has been uploaded to the business. Provide the document ID to get AI-powered analysis and summary.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"businessId": {"type": "string", "description": "The ID of the business"},
					"documentId": {"type": "string", "description": "The ID of the document to analyze"}
				},
				"required": ["businessId", "documentId"]
			}`),
		},
		Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
			bizID, _ := args["businessId"].(string)
			docID, _ := args["documentId"].(string)

			if bizID == "" || docID == "" {
				return `{"error": "businessId and documentId are required"}`, nil
			}

			analysis, err := fh.AnalyzeDocument(ctx, docID, bizID, userID)
			if err != nil {
				return fmt.Sprintf(`{"error": "analysis failed: %s"}`, err.Error()), nil
			}

			return fmt.Sprintf(`{"success": true, "analysis": %s}`, jsonEscape(analysis)), nil
		},
	}
}

func deleteDocumentTool(fh *FileHandler) Tool {
	return Tool{
		Def: ToolDef{
			Name:        "deleteDocument",
			Description: "Delete a document from the business. Provide the document ID to permanently remove it.",
			Parameters: json.RawMessage(`{
				"type": "object",
				"properties": {
					"businessId": {"type": "string", "description": "The ID of the business"},
					"documentId": {"type": "string", "description": "The ID of the document to delete"}
				},
				"required": ["businessId", "documentId"]
			}`),
		},
		Exec: func(ctx context.Context, userID string, args map[string]interface{}) (string, error) {
			bizID, _ := args["businessId"].(string)
			docID, _ := args["documentId"].(string)

			if bizID == "" || docID == "" {
				return `{"error": "businessId and documentId are required"}`, nil
			}

			if err := fh.DeleteDocument(ctx, docID, bizID, userID); err != nil {
				return fmt.Sprintf(`{"error": "delete failed: %s"}`, err.Error()), nil
			}

			return `{"success": true, "message": "Document deleted successfully"}`, nil
		},
	}
}

func splitAndTrim(s, sep string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, sep)
	var result []string
	for _, p := range parts {
		t := strings.TrimSpace(p)
		if t != "" {
			result = append(result, t)
		}
	}
	return result
}

func jsonEscape(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}
