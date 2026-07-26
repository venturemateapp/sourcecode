package graph

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/graphql-go/graphql"
	"github.com/venturemate/vmbackend/internal/ai"
)

var projectFileType = graphql.NewObject(graphql.ObjectConfig{
	Name: "ProjectFile",
	Fields: graphql.Fields{
		"path":    &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"content": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

var codeGenResultType = graphql.NewObject(graphql.ObjectConfig{
	Name: "CodeGenResult",
	Fields: graphql.Fields{
		"files":  &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(projectFileType)))},
		"type":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"routes": &graphql.Field{Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(graphql.String)))},
	},
})

var brandGuideSectionType = graphql.NewObject(graphql.ObjectConfig{
	Name: "BrandGuideSection",
	Fields: graphql.Fields{
		"id":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"title":   &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"content": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"order":   &graphql.Field{Type: graphql.NewNonNull(graphql.Int)},
	},
})

var deployResultType = graphql.NewObject(graphql.ObjectConfig{
	Name: "DeployResult",
	Fields: graphql.Fields{
		"platform": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"url":      &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"repoName": &graphql.Field{Type: graphql.String},
		"siteName": &graphql.Field{Type: graphql.String},
		"success":  &graphql.Field{Type: graphql.NewNonNull(graphql.Boolean)},
		"message":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})

func init() {
	rootMutation.AddFieldConfig("generateWebsiteCode", &graphql.Field{
		Type: codeGenResultType,
		Args: graphql.FieldConfigArgument{
			"businessId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessName": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"websiteDraft": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			websiteDraft := p.Args["websiteDraft"].(string)
			businessName := p.Args["businessName"].(string)
			businessID := p.Args["businessId"].(string)

			// Fetch brand kit for logo and colors
			var logo, tagline string
			if AppContainer != nil && AppContainer.BusinessRepo != nil {
				if biz, err := AppContainer.BusinessRepo.GetByID(p.Context, businessID); err == nil && biz != nil {
					tagline = biz.Tagline
					type BrandKit struct {
						Logo string `json:"logo"`
					}
					var bk BrandKit
					if biz.BrandKit != "" {
						json.Unmarshal([]byte(biz.BrandKit), &bk)
					}
					logo = bk.Logo
				}
			}

			result, err := ai.GenerateReactProject(websiteDraft, businessName, logo, tagline)
			if err != nil {
				return nil, err
			}
			fileMaps := make([]map[string]interface{}, len(result.Files))
			for i, f := range result.Files {
				fileMaps[i] = map[string]interface{}{"path": f.Path, "content": f.Content}
			}
			return map[string]interface{}{"files": fileMaps, "type": result.Type, "routes": result.Routes}, nil
		},
	})

	rootMutation.AddFieldConfig("deployWebsite", &graphql.Field{
		Type: deployResultType,
		Args: graphql.FieldConfigArgument{
			"businessId":   &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
			"businessName": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"websiteDraft": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"platform":     &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
			"siteName":     &graphql.ArgumentConfig{Type: graphql.String},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			websiteDraft := p.Args["websiteDraft"].(string)
			businessName := p.Args["businessName"].(string)
			businessID := p.Args["businessId"].(string)
			platform := p.Args["platform"].(string)
			siteName, _ := p.Args["siteName"].(string)

			// Fetch brand kit for logo and tagline
			var logo, tagline string
			if AppContainer != nil && AppContainer.BusinessRepo != nil {
				if biz, err := AppContainer.BusinessRepo.GetByID(p.Context, businessID); err == nil && biz != nil {
					tagline = biz.Tagline
					type BrandKit struct {
						Logo string `json:"logo"`
					}
					var bk BrandKit
					if biz.BrandKit != "" {
						json.Unmarshal([]byte(biz.BrandKit), &bk)
					}
					logo = bk.Logo
				}
			}

			result, err := ai.GenerateReactProject(websiteDraft, businessName, logo, tagline)
			if err != nil {
				return okResult(platform, false, "Code generation failed: "+err.Error()), nil
			}

			switch platform {
			case "github":
				repoName := safeRepoName(businessName)
				dr, err := ai.DeployToGitHub(p.Context, result.Files, repoName, businessName+" website built by VentureMate AI")
				if err != nil {
					return okResult("github", false, "GitHub deploy failed: "+err.Error()), nil
				}
				return map[string]interface{}{
					"platform": dr.Platform, "url": dr.URL, "repoName": dr.RepoName,
					"success": true, "message": dr.Message,
				}, nil

			case "netlify":
				// Write files to temp dir, build, then deploy dist/
				tmpDir, buildErr := os.MkdirTemp("", "vm-netlify-*")
				if buildErr != nil {
					return okResult("netlify", false, "Temp dir creation failed: "+buildErr.Error()), nil
				}
				for _, f := range result.Files {
					fp := filepath.Join(tmpDir, f.Path)
					os.MkdirAll(filepath.Dir(fp), 0755)
					os.WriteFile(fp, []byte(f.Content), 0644)
				}
				// Run npm install && npm run build
				npmInstall := exec.Command("npm", "install")
				npmInstall.Dir = tmpDir
				if out, err := npmInstall.CombinedOutput(); err != nil {
					os.RemoveAll(tmpDir)
					return okResult("netlify", false, "npm install failed: "+string(out)), nil
				}
				npmBuild := exec.Command("npm", "run", "build")
				npmBuild.Dir = tmpDir
				if out, err := npmBuild.CombinedOutput(); err != nil {
					os.RemoveAll(tmpDir)
					return okResult("netlify", false, "npm build failed: "+string(out)), nil
				}
				// Zip the dist/ folder
				distDir := filepath.Join(tmpDir, "dist")
				zipData, zipErr := ai.ZipDirectory(distDir)
				os.RemoveAll(tmpDir)
				if zipErr != nil {
					return okResult("netlify", false, "ZIP creation failed: "+zipErr.Error()), nil
				}
				dr, err := ai.DeployToNetlify(p.Context, zipData, siteName)
				if err != nil {
					return okResult("netlify", false, "Netlify deploy failed: "+err.Error()), nil
				}
				return map[string]interface{}{
					"platform": dr.Platform, "url": dr.URL, "siteName": dr.SiteName,
					"success": true, "message": dr.Message,
				}, nil

			default:
				return okResult(platform, false, "Unsupported platform: "+platform+" (use github or netlify)"), nil
			}
		},
	})

	rootMutation.AddFieldConfig("generateBrandGuide", &graphql.Field{
		Type: graphql.NewNonNull(graphql.NewList(graphql.NewNonNull(brandGuideSectionType))),
		Args: graphql.FieldConfigArgument{
			"businessId": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
		},
		Resolve: func(p graphql.ResolveParams) (interface{}, error) {
			if AppContainer == nil || AppContainer.BusinessRepo == nil {
				return []interface{}{}, nil
			}
			businessID := p.Args["businessId"].(string)
			userID, err := requireWebsiteUser(p)
			if err != nil {
				return []interface{}{}, nil
			}
			biz, err := AppContainer.BusinessRepo.GetByIDAndUser(p.Context, businessID, userID)
			if err != nil || biz == nil {
				return []interface{}{}, nil
			}
			var brandKit map[string]interface{}
			json.Unmarshal([]byte(biz.BrandKit), &brandKit)
			sections, err := ai.GenerateBrandGuide(biz, brandKit)
			if err != nil {
				return []interface{}{}, nil
			}
			result := make([]map[string]interface{}, len(sections))
			for i, s := range sections {
				result[i] = map[string]interface{}{
					"id": s.ID, "title": s.Title, "content": s.Content, "order": s.Order,
				}
			}
			return result, nil
		},
	})
}

func okResult(platform string, success bool, msg string) map[string]interface{} {
	return map[string]interface{}{"platform": platform, "url": "", "success": success, "message": msg}
}

func safeRepoName(name string) string {
	name = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return -1
	}, name)
	name = strings.Trim(strings.ToLower(name), "-")
	if name == "" {
		return "venturemate-site"
	}
	return name
}
