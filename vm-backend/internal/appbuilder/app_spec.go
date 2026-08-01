package appbuilder

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

type ThemeSpec struct {
	Primary     string `json:"primary"`
	Secondary   string `json:"secondary"`
	Background  string `json:"background"`
	Surface     string `json:"surface"`
	Text        string `json:"text"`
	HeadingFont string `json:"headingFont"`
	BodyFont    string `json:"bodyFont"`
	Radius      int    `json:"radius"`
}

type RouteSpec struct {
	ID        string `json:"id"`
	Path      string `json:"path"`
	Name      string `json:"name"`
	Protected bool   `json:"protected"`
}

type EntityField struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"`
	Required bool   `json:"required"`
}
type EntitySpec struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Slug        string          `json:"slug"`
	Fields      []EntityField   `json:"fields"`
	Permissions map[string]bool `json:"permissions,omitempty"`
}

type AppSpec struct {
	SchemaVersion string           `json:"schemaVersion"`
	Name          string           `json:"name"`
	Mode          string           `json:"mode"`
	Theme         ThemeSpec        `json:"theme"`
	Routes        []RouteSpec      `json:"routes"`
	Navigation    map[string]any   `json:"navigation"`
	Entities      []EntitySpec     `json:"entities"`
	Workflows     []map[string]any `json:"workflows"`
	Assets        []map[string]any `json:"assets"`
	SEO           map[string]any   `json:"seo"`
	Permissions   map[string]any   `json:"permissions"`
}

func (s *AppSpec) Validate() error {
	if s == nil {
		return errors.New("app spec is required")
	}
	if s.SchemaVersion == "" {
		s.SchemaVersion = "1.0"
	}
	if strings.TrimSpace(s.Name) == "" {
		return errors.New("app spec name is required")
	}
	switch s.Mode {
	case "marketing_website", "functional_web_app", "website_plus_app":
	default:
		return fmt.Errorf("invalid app mode %q", s.Mode)
	}
	seen := map[string]bool{}
	for _, route := range s.Routes {
		if route.ID == "" || route.Path == "" {
			return errors.New("every route requires a stable id and path")
		}
		if seen[route.ID] {
			return fmt.Errorf("duplicate route id %s", route.ID)
		}
		seen[route.ID] = true
	}
	allowedPermissions := map[string]bool{"publicRead": true, "publicCreate": true, "publicUpdate": true, "publicDelete": true}
	for _, entity := range s.Entities {
		if entity.ID == "" || entity.Slug == "" {
			return errors.New("every entity requires a stable id and slug")
		}
		if seen[entity.ID] {
			return fmt.Errorf("duplicate stable id %s", entity.ID)
		}
		seen[entity.ID] = true
		for permission := range entity.Permissions {
			if !allowedPermissions[permission] {
				return fmt.Errorf("unsupported permission %s for entity %s", permission, entity.Slug)
			}
		}
	}
	return nil
}

func ParseAppSpec(raw string) (*AppSpec, error) {
	var spec AppSpec
	if err := json.Unmarshal([]byte(raw), &spec); err != nil {
		return nil, err
	}
	if err := spec.Validate(); err != nil {
		return nil, err
	}
	return &spec, nil
}
