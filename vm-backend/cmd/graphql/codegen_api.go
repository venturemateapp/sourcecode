package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/venturemate/vmbackend/internal/ai"
)

type GenRequest struct {
	Draft    json.RawMessage  `json:"draft"`
	Metadata map[string]string `json:"metadata,omitempty"`
}

type GenResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

// POST /api/generate — generates a website zip from a draft JSON
func handleGenerateWebsite(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}

	var req GenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(GenResponse{Success: false, Message: "Invalid request: " + err.Error()})
		return
	}

	log.Printf("Generating website from draft (%d bytes)", len(req.Draft))

	// Use the improved GenerateReactProject with the new draft format
	result, err := ai.GenerateReactProject(string(req.Draft), "", "", "")
	if err != nil {
		json.NewEncoder(w).Encode(GenResponse{Success: false, Message: "Generation failed: " + err.Error()})
		return
	}

	// Zip files
	zipData, err := ai.ZipProjectFiles(result.Files)
	if err != nil {
		json.NewEncoder(w).Encode(GenResponse{Success: false, Message: "Zip failed: " + err.Error()})
		return
	}

	// Return zip as download
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="website_%d.zip"`, time.Now().Unix()))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(zipData)))
	w.Write(zipData)

	log.Printf("Generated website (%d files, %d bytes)", len(result.Files), len(zipData))
}
