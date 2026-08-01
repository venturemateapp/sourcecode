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
	"time"
)

// DeploymentResult holds the result of a deployment operation.
type DeploymentResult struct {
	Platform string `json:"platform"` // "github" or "netlify"
	URL      string `json:"url"`
	RepoName string `json:"repoName,omitempty"`
	SiteName string `json:"siteName,omitempty"`
	Success  bool   `json:"success"`
	Message  string `json:"message"`
}

// DeployToGitHub creates or updates a GitHub repository with the approved project files.
// Authentication uses a server-side integration token and never sends credentials to the browser.
func DeployToGitHub(ctx context.Context, files []ProjectFile, repoName, description string) (*DeploymentResult, error) {
	token := strings.TrimSpace(os.Getenv("VM_GITHUB_TOKEN"))
	if token == "" {
		return nil, fmt.Errorf("VM_GITHUB_TOKEN environment variable is not set")
	}
	if strings.TrimSpace(repoName) == "" || len(repoName) > 100 {
		return nil, fmt.Errorf("invalid GitHub repository name")
	}
	client := &http.Client{Timeout: 60 * time.Second}

	createReq := map[string]interface{}{
		"name": repoName, "description": description, "private": true, "auto_init": true,
	}
	var repoResult struct {
		FullName      string `json:"full_name"`
		HTMLURL       string `json:"html_url"`
		DefaultBranch string `json:"default_branch"`
	}
	status, responseBody, err := githubJSON(ctx, client, token, http.MethodPost, "https://api.github.com/user/repos", createReq, &repoResult)
	if err != nil {
		return nil, fmt.Errorf("github create repository failed: %w", err)
	}
	if status == http.StatusUnprocessableEntity {
		owner, ownerErr := getUserForToken(ctx, client, token)
		if ownerErr != nil {
			return nil, fmt.Errorf("github repository may already exist, but account lookup failed: %w", ownerErr)
		}
		status, responseBody, err = githubJSON(ctx, client, token, http.MethodGet, fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repoName), nil, &repoResult)
		if err != nil || status != http.StatusOK {
			return nil, fmt.Errorf("github repository lookup failed (%d): %s", status, safeRemoteMessage(responseBody))
		}
	} else if status != http.StatusCreated {
		return nil, fmt.Errorf("github create repository failed (%d): %s", status, safeRemoteMessage(responseBody))
	}
	if repoResult.FullName == "" || repoResult.HTMLURL == "" {
		return nil, fmt.Errorf("github returned an incomplete repository response")
	}
	if repoResult.DefaultBranch == "" {
		repoResult.DefaultBranch = "main"
	}

	var refResult struct {
		Object struct {
			SHA string `json:"sha"`
		} `json:"object"`
	}
	refURL := fmt.Sprintf("https://api.github.com/repos/%s/git/ref/heads/%s", repoResult.FullName, repoResult.DefaultBranch)
	status, responseBody, err = githubJSON(ctx, client, token, http.MethodGet, refURL, nil, &refResult)
	if err != nil || status != http.StatusOK || refResult.Object.SHA == "" {
		return nil, fmt.Errorf("github branch lookup failed (%d): %s", status, safeRemoteMessage(responseBody))
	}
	parentCommitSHA := refResult.Object.SHA

	type treeItem struct {
		Path string `json:"path"`
		Mode string `json:"mode"`
		Type string `json:"type"`
		SHA  string `json:"sha"`
	}
	treeItems := make([]treeItem, 0, len(files))
	for _, file := range files {
		if strings.TrimSpace(file.Path) == "" || strings.Contains(file.Path, "..") || strings.HasPrefix(file.Path, "/") {
			return nil, fmt.Errorf("unsafe GitHub file path %q", file.Path)
		}
		blobReq := map[string]string{"content": base64.StdEncoding.EncodeToString([]byte(file.Content)), "encoding": "base64"}
		var blobResult struct {
			SHA string `json:"sha"`
		}
		blobURL := fmt.Sprintf("https://api.github.com/repos/%s/git/blobs", repoResult.FullName)
		status, responseBody, err = githubJSON(ctx, client, token, http.MethodPost, blobURL, blobReq, &blobResult)
		if err != nil || status != http.StatusCreated || blobResult.SHA == "" {
			return nil, fmt.Errorf("github blob creation failed for %s (%d): %s", file.Path, status, safeRemoteMessage(responseBody))
		}
		treeItems = append(treeItems, treeItem{Path: file.Path, Mode: "100644", Type: "blob", SHA: blobResult.SHA})
	}

	var treeResult struct {
		SHA string `json:"sha"`
	}
	treeURL := fmt.Sprintf("https://api.github.com/repos/%s/git/trees", repoResult.FullName)
	status, responseBody, err = githubJSON(ctx, client, token, http.MethodPost, treeURL, map[string]interface{}{"tree": treeItems}, &treeResult)
	if err != nil || status != http.StatusCreated || treeResult.SHA == "" {
		return nil, fmt.Errorf("github tree creation failed (%d): %s", status, safeRemoteMessage(responseBody))
	}

	var commitResult struct {
		SHA string `json:"sha"`
	}
	commitURL := fmt.Sprintf("https://api.github.com/repos/%s/git/commits", repoResult.FullName)
	status, responseBody, err = githubJSON(ctx, client, token, http.MethodPost, commitURL, map[string]interface{}{
		"message": "Publish from VentureMate AI Studio", "tree": treeResult.SHA, "parents": []string{parentCommitSHA},
	}, &commitResult)
	if err != nil || status != http.StatusCreated || commitResult.SHA == "" {
		return nil, fmt.Errorf("github commit creation failed (%d): %s", status, safeRemoteMessage(responseBody))
	}

	updateURL := fmt.Sprintf("https://api.github.com/repos/%s/git/refs/heads/%s", repoResult.FullName, repoResult.DefaultBranch)
	status, responseBody, err = githubJSON(ctx, client, token, http.MethodPatch, updateURL, map[string]interface{}{"sha": commitResult.SHA, "force": true}, nil)
	if err != nil || status != http.StatusOK {
		return nil, fmt.Errorf("github branch update failed (%d): %s", status, safeRemoteMessage(responseBody))
	}
	return &DeploymentResult{Platform: "github", URL: repoResult.HTMLURL, RepoName: repoResult.FullName, Success: true, Message: fmt.Sprintf("Code published to %s", repoResult.HTMLURL)}, nil
}

// DeployToNetlify uploads an already-built static ZIP. It never runs package installation or builds inside an API request.
func DeployToNetlify(ctx context.Context, zipData []byte, siteName string) (*DeploymentResult, error) {
	token := strings.TrimSpace(os.Getenv("NETLIFY_AUTH_TOKEN"))
	if token == "" {
		return nil, fmt.Errorf("NETLIFY_AUTH_TOKEN environment variable is not set")
	}
	if len(zipData) == 0 || len(zipData) > 100<<20 {
		return nil, fmt.Errorf("invalid Netlify build artifact")
	}
	client := &http.Client{Timeout: 90 * time.Second}
	createPayload := map[string]interface{}{}
	if strings.TrimSpace(siteName) != "" {
		createPayload["name"] = siteName
	}
	payload, _ := json.Marshal(createPayload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.netlify.com/api/v1/sites", bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("netlify create site failed: %w", err)
	}
	body, readErr := readRemoteBody(resp.Body)
	resp.Body.Close()
	if readErr != nil {
		return nil, readErr
	}
	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("netlify create site failed (%d): %s", resp.StatusCode, safeRemoteMessage(body))
	}
	var siteResult struct {
		ID      string `json:"id"`
		SiteURL string `json:"ssl_url"`
		Name    string `json:"name"`
	}
	if err := json.Unmarshal(body, &siteResult); err != nil || siteResult.ID == "" {
		return nil, fmt.Errorf("netlify returned an invalid site response")
	}

	deployURL := fmt.Sprintf("https://api.netlify.com/api/v1/sites/%s/deploys", siteResult.ID)
	deployReq, err := http.NewRequestWithContext(ctx, http.MethodPost, deployURL, bytes.NewReader(zipData))
	if err != nil {
		return nil, err
	}
	deployReq.Header.Set("Authorization", "Bearer "+token)
	deployReq.Header.Set("Content-Type", "application/zip")
	deployResp, err := client.Do(deployReq)
	if err != nil {
		return nil, fmt.Errorf("netlify deploy failed: %w", err)
	}
	deployBody, readErr := readRemoteBody(deployResp.Body)
	deployResp.Body.Close()
	if readErr != nil {
		return nil, readErr
	}
	if deployResp.StatusCode != http.StatusOK && deployResp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("netlify deploy failed (%d): %s", deployResp.StatusCode, safeRemoteMessage(deployBody))
	}
	var deployResult struct {
		URL   string `json:"ssl_url"`
		State string `json:"state"`
	}
	if err := json.Unmarshal(deployBody, &deployResult); err != nil {
		return nil, fmt.Errorf("netlify returned an invalid deploy response")
	}
	liveURL := deployResult.URL
	if liveURL == "" {
		liveURL = siteResult.SiteURL
	}
	if liveURL == "" {
		return nil, fmt.Errorf("netlify deployment completed without a public URL")
	}
	return &DeploymentResult{Platform: "netlify", URL: liveURL, SiteName: siteResult.Name, Success: true, Message: fmt.Sprintf("Deployed to %s", liveURL)}, nil
}

func githubJSON(ctx context.Context, client *http.Client, token, method, endpoint string, payload interface{}, output interface{}) (int, []byte, error) {
	var reader io.Reader
	if payload != nil {
		encoded, err := json.Marshal(payload)
		if err != nil {
			return 0, nil, err
		}
		reader = bytes.NewReader(encoded)
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, reader)
	if err != nil {
		return 0, nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, err
	}
	body, readErr := readRemoteBody(resp.Body)
	resp.Body.Close()
	if readErr != nil {
		return resp.StatusCode, nil, readErr
	}
	if output != nil && len(body) > 0 && resp.StatusCode >= 200 && resp.StatusCode < 300 {
		if err := json.Unmarshal(body, output); err != nil {
			return resp.StatusCode, body, err
		}
	}
	return resp.StatusCode, body, nil
}

func getUserForToken(ctx context.Context, client *http.Client, token string) (string, error) {
	var userResult struct {
		Login string `json:"login"`
	}
	status, body, err := githubJSON(ctx, client, token, http.MethodGet, "https://api.github.com/user", nil, &userResult)
	if err != nil || status != http.StatusOK || strings.TrimSpace(userResult.Login) == "" {
		return "", fmt.Errorf("github user lookup failed (%d): %s", status, safeRemoteMessage(body))
	}
	return userResult.Login, nil
}

func readRemoteBody(body io.Reader) ([]byte, error) {
	return io.ReadAll(io.LimitReader(body, 1<<20))
}

func safeRemoteMessage(body []byte) string {
	message := strings.TrimSpace(string(body))
	if len(message) > 2000 {
		message = message[:2000]
	}
	if message == "" {
		return "remote service returned no details"
	}
	return message
}
