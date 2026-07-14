package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// DeploymentResult holds the result of a deployment operation.
type DeploymentResult struct {
	Platform  string `json:"platform"`  // "github" or "netlify"
	URL       string `json:"url"`
	RepoName  string `json:"repoName,omitempty"`
	SiteName  string `json:"siteName,omitempty"`
	Success   bool   `json:"success"`
	Message   string `json:"message"`
}

// DeployToGitHub creates a GitHub repository and pushes the generated project files.
func DeployToGitHub(ctx context.Context, files []ProjectFile, repoName, description string) (*DeploymentResult, error) {
	token := strings.TrimSpace(os.Getenv("VM_GITHUB_TOKEN"))
	if token == "" {
		return nil, fmt.Errorf("VM_GITHUB_TOKEN environment variable is not set")
	}
	client := &http.Client{}

	// Create repo
	createReq := map[string]interface{}{
		"name":        repoName,
		"description": description,
		"private":     false,
		"auto_init":   true,
	}
	body, _ := json.Marshal(createReq)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.github.com/user/repos", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("github create repo request failed: %w", err)
	}
	defer resp.Body.Close()

	var repoResult struct {
		FullName string `json:"full_name"`
		HTMLURL  string `json:"html_url"`
		DefaultBranch string `json:"default_branch"`
	}

	if resp.StatusCode == 422 {
		// Repo may already exist
		getReq, _ := http.NewRequestWithContext(ctx, http.MethodGet,
			fmt.Sprintf("https://api.github.com/repos/%s/%s", getUserForToken(ctx, client, token), repoName), nil)
		getReq.Header.Set("Authorization", "Bearer "+token)
		getReq.Header.Set("Accept", "application/vnd.github.v3+json")
		getResp, getErr := client.Do(getReq)
		if getErr != nil {
			return nil, fmt.Errorf("repo might exist but cannot verify: %w", getErr)
		}
		defer getResp.Body.Close()
		json.NewDecoder(getResp.Body).Decode(&repoResult)
	} else {
		json.NewDecoder(resp.Body).Decode(&repoResult)
	}

	if repoResult.DefaultBranch == "" {
		repoResult.DefaultBranch = "main"
	}

	// Get the latest commit SHA on the default branch
	refURL := fmt.Sprintf("https://api.github.com/repos/%s/git/refs/heads/%s", repoResult.FullName, repoResult.DefaultBranch)
	refReq, _ := http.NewRequestWithContext(ctx, http.MethodGet, refURL, nil)
	refReq.Header.Set("Authorization", "Bearer "+token)
	refReq.Header.Set("Accept", "application/vnd.github.v3+json")
	refResp, err := client.Do(refReq)
	if err != nil {
		return nil, fmt.Errorf("github get ref failed: %w", err)
	}
	defer refResp.Body.Close()

	var refResult struct {
		Object struct {
			SHA string `json:"sha"`
		} `json:"object"`
	}
	if err := json.NewDecoder(refResp.Body).Decode(&refResult); err != nil {
		return nil, fmt.Errorf("github get ref decode failed: %w", err)
	}
	baseTreeSHA := refResult.Object.SHA

	// Create blobs for each file
	type blob struct {
		SHA string `json:"sha"`
		Path string `json:"path"`
	}
	var blobs []blob
	for _, f := range files {
		blobReq := map[string]string{
			"content":  base64.StdEncoding.EncodeToString([]byte(f.Content)),
			"encoding": "base64",
		}
		b, _ := json.Marshal(blobReq)
		blobURL := fmt.Sprintf("https://api.github.com/repos/%s/git/blobs", repoResult.FullName)
		blobHTTPReq, _ := http.NewRequestWithContext(ctx, http.MethodPost, blobURL, bytes.NewReader(b))
		blobHTTPReq.Header.Set("Authorization", "Bearer "+token)
		blobHTTPReq.Header.Set("Content-Type", "application/json")
		blobHTTPReq.Header.Set("Accept", "application/vnd.github.v3+json")
		blobResp, blobErr := client.Do(blobHTTPReq)
		if blobErr != nil {
			return nil, fmt.Errorf("github create blob for %s failed: %w", f.Path, blobErr)
		}
		var blobResult struct {
			SHA string `json:"sha"`
		}
		json.NewDecoder(blobResp.Body).Decode(&blobResult)
		blobResp.Body.Close()
		blobs = append(blobs, blob{SHA: blobResult.SHA, Path: f.Path})
	}

	// Create tree
	type treeItem struct {
		Path string `json:"path"`
		Mode string `json:"mode"`
		Type string `json:"type"`
		SHA  string `json:"sha"`
	}
	var treeItems []treeItem
	for _, b := range blobs {
		treeItems = append(treeItems, treeItem{Path: b.Path, Mode: "100644", Type: "blob", SHA: b.SHA})
	}
	treeReq := map[string]interface{}{
		"base_tree": baseTreeSHA,
		"tree":      treeItems,
	}
	b, _ := json.Marshal(treeReq)
	treeURL := fmt.Sprintf("https://api.github.com/repos/%s/git/trees", repoResult.FullName)
	treeHTTPReq, _ := http.NewRequestWithContext(ctx, http.MethodPost, treeURL, bytes.NewReader(b))
	treeHTTPReq.Header.Set("Authorization", "Bearer "+token)
	treeHTTPReq.Header.Set("Content-Type", "application/json")
	treeHTTPReq.Header.Set("Accept", "application/vnd.github.v3+json")
	treeResp, err := client.Do(treeHTTPReq)
	if err != nil {
		return nil, fmt.Errorf("github create tree failed: %w", err)
	}
	defer treeResp.Body.Close()
	var treeResult struct {
		SHA string `json:"sha"`
	}
	json.NewDecoder(treeResp.Body).Decode(&treeResult)

	// Create commit
	commitReq := map[string]interface{}{
		"message": "Initial commit from VentureMate AI",
		"tree":    treeResult.SHA,
		"parents": []string{baseTreeSHA},
	}
	cb, _ := json.Marshal(commitReq)
	commitURL := fmt.Sprintf("https://api.github.com/repos/%s/git/commits", repoResult.FullName)
	commitHTTPReq, _ := http.NewRequestWithContext(ctx, http.MethodPost, commitURL, bytes.NewReader(cb))
	commitHTTPReq.Header.Set("Authorization", "Bearer "+token)
	commitHTTPReq.Header.Set("Content-Type", "application/json")
	commitHTTPReq.Header.Set("Accept", "application/vnd.github.v3+json")
	commitResp, err := client.Do(commitHTTPReq)
	if err != nil {
		return nil, fmt.Errorf("github create commit failed: %w", err)
	}
	defer commitResp.Body.Close()
	var commitResult struct {
		SHA string `json:"sha"`
	}
	json.NewDecoder(commitResp.Body).Decode(&commitResult)

	// Update ref
	updateRefReq := map[string]string{
		"sha": commitResult.SHA,
		"force": "true",
	}
	ub, _ := json.Marshal(updateRefReq)
	updateURL := fmt.Sprintf("https://api.github.com/repos/%s/git/refs/heads/%s", repoResult.FullName, repoResult.DefaultBranch)
	updateHTTPReq, _ := http.NewRequestWithContext(ctx, http.MethodPatch, updateURL, bytes.NewReader(ub))
	updateHTTPReq.Header.Set("Authorization", "Bearer "+token)
	updateHTTPReq.Header.Set("Content-Type", "application/json")
	updateHTTPReq.Header.Set("Accept", "application/vnd.github.v3+json")
	updateResp, err := client.Do(updateHTTPReq)
	if err != nil {
		return nil, fmt.Errorf("github update ref failed: %w", err)
	}
	updateResp.Body.Close()

	return &DeploymentResult{
		Platform: "github",
		URL:      repoResult.HTMLURL,
		RepoName: repoResult.FullName,
		Success:  true,
		Message:  fmt.Sprintf("Code pushed to %s", repoResult.HTMLURL),
	}, nil
}

// DeployToNetlify uploads a ZIP of the generated project to Netlify and returns the site URL.
func DeployToNetlify(ctx context.Context, zipData []byte, siteName string) (*DeploymentResult, error) {
	token := strings.TrimSpace(os.Getenv("NETLIFY_AUTH_TOKEN"))
	if token == "" {
		return nil, fmt.Errorf("NETLIFY_AUTH_TOKEN environment variable is not set")
	}
	client := &http.Client{}

	// Create site
	createPayload := map[string]interface{}{}
	if siteName != "" {
		createPayload["name"] = siteName
		createPayload["force"] = true
	}
	b, _ := json.Marshal(createPayload)
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.netlify.com/api/v1/sites", bytes.NewReader(b))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("netlify create site failed: %w", err)
	}
	defer resp.Body.Close()

	var siteResult struct {
		ID       string `json:"id"`
		SiteURL  string `json:"ssl_url"`
		Name     string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&siteResult); err != nil {
		return nil, fmt.Errorf("netlify create site decode failed: %w", err)
	}

	// Deploy ZIP
	deployURL := fmt.Sprintf("https://api.netlify.com/api/v1/sites/%s/deploys", siteResult.ID)
	deployReq, _ := http.NewRequestWithContext(ctx, http.MethodPost, deployURL, bytes.NewReader(zipData))
	deployReq.Header.Set("Authorization", "Bearer "+token)
	deployReq.Header.Set("Content-Type", "application/zip")
	deployResp, err := client.Do(deployReq)
	if err != nil {
		return nil, fmt.Errorf("netlify deploy failed: %w", err)
	}
	defer deployResp.Body.Close()

	var deployResult struct {
		URL     string `json:"ssl_url"`
		 State   string `json:"state"`
	}
	body, _ := io.ReadAll(deployResp.Body)
	json.Unmarshal(body, &deployResult)

	liveURL := deployResult.URL
	if liveURL == "" {
		liveURL = siteResult.SiteURL
	}

	return &DeploymentResult{
		Platform: "netlify",
		URL:      liveURL,
		SiteName: siteResult.Name,
		Success:  true,
		Message:  fmt.Sprintf("Deployed to %s", liveURL),
	}, nil
}

func getUserForToken(ctx context.Context, client *http.Client, token string) string {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	resp, err := client.Do(req)
	if err != nil {
		return "user"
	}
	defer resp.Body.Close()
	var userResult struct {
		Login string `json:"login"`
	}
	json.NewDecoder(resp.Body).Decode(&userResult)
	if userResult.Login != "" {
		return userResult.Login
	}
	return "user"
}
