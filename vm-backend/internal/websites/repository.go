package websites

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var subdomainPattern = regexp.MustCompile(`^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$`)
var hostnamePattern = regexp.MustCompile(`^(?i:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)$`)

var reservedSubdomains = map[string]struct{}{
	"admin": {}, "api": {}, "app": {}, "auth": {}, "blog": {}, "cdn": {}, "dashboard": {},
	"docs": {}, "help": {}, "mail": {}, "smtp": {}, "status": {}, "support": {}, "www": {},
	"venturemate": {}, "sites": {}, "assets": {}, "static": {}, "graphql": {}, "billing": {},
}

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const websiteColumns = `id, business_id, COALESCE(template_id::text, ''), subdomain, custom_domain,
	pages::text, global_styles::text, navigation::text, footer::text, status, published_at, last_modified,
	published_subdomain, published_custom_domain, COALESCE(published_pages::text, ''),
	COALESCE(published_global_styles::text, ''), COALESCE(published_navigation::text, ''),
	COALESCE(published_footer::text, ''), COALESCE(published_business_snapshot::text, '{}'), draft_revision, published_revision, custom_domain_status,
	custom_domain_verification_token, custom_domain_verified_at, created_at, updated_at`

const publicWebsiteColumns = `w.id, w.business_id, COALESCE(w.template_id::text, ''), w.subdomain, w.custom_domain,
	w.pages::text, w.global_styles::text, w.navigation::text, w.footer::text, w.status, w.published_at, w.last_modified,
	w.published_subdomain, w.published_custom_domain, COALESCE(w.published_pages::text, ''),
	COALESCE(w.published_global_styles::text, ''), COALESCE(w.published_navigation::text, ''),
	COALESCE(w.published_footer::text, ''), COALESCE(w.published_business_snapshot::text, '{}'), w.draft_revision, w.published_revision, w.custom_domain_status,
	w.custom_domain_verification_token, w.custom_domain_verified_at, w.created_at, w.updated_at`

func scanWebsite(row pgx.Row) (*UserWebsite, error) {
	var w UserWebsite
	if err := row.Scan(
		&w.ID, &w.BusinessID, &w.TemplateID, &w.Subdomain, &w.CustomDomain,
		&w.Pages, &w.GlobalStyles, &w.Navigation, &w.Footer, &w.Status, &w.PublishedAt, &w.LastModified,
		&w.PublishedSubdomain, &w.PublishedCustomDomain, &w.PublishedPages,
		&w.PublishedGlobalStyles, &w.PublishedNavigation, &w.PublishedFooter, &w.PublishedBusinessSnapshot,
		&w.DraftRevision, &w.PublishedRevision, &w.CustomDomainStatus,
		&w.CustomDomainVerificationToken, &w.CustomDomainVerifiedAt, &w.CreatedAt, &w.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &w, nil
}

func (r *Repository) ListTemplates(ctx context.Context) ([]WebsiteTemplate, error) {
	rows, err := r.db.Query(ctx, `SELECT id::text, name, description, thumbnail, category, template_data::text, is_active, created_at, updated_at FROM website_templates WHERE is_active = true ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []WebsiteTemplate
	for rows.Next() {
		var t WebsiteTemplate
		if err := rows.Scan(&t.ID, &t.Name, &t.Description, &t.Thumbnail, &t.Category, &t.TemplateData, &t.IsActive, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

func (r *Repository) GetTemplateByID(ctx context.Context, id string) (*WebsiteTemplate, error) {
	row := r.db.QueryRow(ctx, `SELECT id::text, name, description, thumbnail, category, template_data::text, is_active, created_at, updated_at FROM website_templates WHERE id = $1`, id)
	var t WebsiteTemplate
	if err := row.Scan(&t.ID, &t.Name, &t.Description, &t.Thumbnail, &t.Category, &t.TemplateData, &t.IsActive, &t.CreatedAt, &t.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &t, nil
}

func (r *Repository) GetWebsiteByBusiness(ctx context.Context, businessID string) (*UserWebsite, error) {
	w, err := scanWebsite(r.db.QueryRow(ctx, `SELECT `+websiteColumns+` FROM user_websites WHERE business_id = $1`, businessID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return w, err
}

func (r *Repository) GetWebsiteByIDAndBusiness(ctx context.Context, id, businessID string) (*UserWebsite, error) {
	w, err := scanWebsite(r.db.QueryRow(ctx, `SELECT `+websiteColumns+` FROM user_websites WHERE id = $1 AND business_id = $2`, id, businessID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return w, err
}

func NormalizeSubdomain(value string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.TrimSuffix(value, ".venturemate.net")
	value = strings.Trim(value, "-")
	value = regexp.MustCompile(`[^a-z0-9-]+`).ReplaceAllString(value, "-")
	value = regexp.MustCompile(`-+`).ReplaceAllString(value, "-")
	if len(value) < 3 || len(value) > 63 {
		return "", fmt.Errorf("subdomain must be between 3 and 63 characters")
	}
	if !subdomainPattern.MatchString(value) {
		return "", fmt.Errorf("subdomain can only contain lowercase letters, numbers, and single hyphens")
	}
	if _, reserved := reservedSubdomains[value]; reserved {
		return "", fmt.Errorf("%q is reserved by VentureMate", value)
	}
	return value, nil
}

func NormalizeCustomDomain(value string, baseDomain string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.TrimPrefix(value, "https://")
	value = strings.TrimPrefix(value, "http://")
	if slash := strings.IndexByte(value, '/'); slash >= 0 {
		value = value[:slash]
	}
	value = strings.TrimSuffix(value, ".")
	if value == "" {
		return "", nil
	}
	if net.ParseIP(value) != nil {
		return "", fmt.Errorf("enter a domain name, not an IP address")
	}
	if len(value) > 253 || !hostnamePattern.MatchString(value) {
		return "", fmt.Errorf("enter a valid domain name, for example example.com")
	}
	if value == baseDomain || strings.HasSuffix(value, "."+baseDomain) {
		return "", fmt.Errorf("use the VentureMate subdomain field for %s addresses", baseDomain)
	}
	return value, nil
}

func (r *Repository) IsSubdomainAvailable(ctx context.Context, value, excludeWebsiteID string) (bool, string, error) {
	normalized, err := NormalizeSubdomain(value)
	if err != nil {
		return false, "", err
	}
	var exists bool
	err = r.db.QueryRow(ctx, `SELECT EXISTS(
		SELECT 1 FROM user_websites WHERE LOWER(subdomain) = LOWER($1) AND ($2 = '' OR id::text <> $2)
	)`, normalized, excludeWebsiteID).Scan(&exists)
	return !exists, normalized, err
}

func (r *Repository) CreateWebsite(ctx context.Context, w *UserWebsite) error {
	w.ID = uuid.New().String()
	now := time.Now().UTC()
	w.CreatedAt = now
	w.UpdatedAt = now
	w.LastModified = now
	w.DraftRevision = 1
	w.PublishedRevision = 0
	if w.Status == "" {
		w.Status = StatusDraft
	}
	if w.Pages == "" {
		w.Pages = "[]"
	}
	if w.GlobalStyles == "" {
		w.GlobalStyles = "{}"
	}
	if w.Navigation == "" {
		w.Navigation = "{}"
	}
	if w.Footer == "" {
		w.Footer = "{}"
	}
	if w.CustomDomainStatus == "" {
		w.CustomDomainStatus = CustomDomainNone
	}
	if w.Subdomain != "" {
		normalized, err := NormalizeSubdomain(w.Subdomain)
		if err != nil {
			return err
		}
		available, _, err := r.IsSubdomainAvailable(ctx, normalized, "")
		if err != nil {
			return err
		}
		if !available {
			return fmt.Errorf("subdomain %q is already in use", normalized)
		}
		w.Subdomain = normalized
	}
	_, err := r.db.Exec(ctx, `INSERT INTO user_websites (
		id, business_id, template_id, subdomain, custom_domain, pages, global_styles, navigation, footer,
		status, published_at, last_modified, draft_revision, published_revision, custom_domain_status,
		custom_domain_verification_token, created_at, updated_at
	) VALUES ($1,$2,NULLIF($3,'')::uuid,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
		w.ID, w.BusinessID, w.TemplateID, w.Subdomain, w.CustomDomain, w.Pages, w.GlobalStyles, w.Navigation,
		w.Footer, w.Status, w.PublishedAt, w.LastModified, w.DraftRevision, w.PublishedRevision,
		w.CustomDomainStatus, w.CustomDomainVerificationToken, w.CreatedAt, w.UpdatedAt)
	return err
}

func (r *Repository) UpdateWebsite(ctx context.Context, w *UserWebsite) error {
	if w == nil {
		return errors.New("website is required")
	}
	if w.Subdomain != "" {
		normalized, err := NormalizeSubdomain(w.Subdomain)
		if err != nil {
			return err
		}
		available, _, err := r.IsSubdomainAvailable(ctx, normalized, w.ID)
		if err != nil {
			return err
		}
		if !available {
			return fmt.Errorf("subdomain %q is already in use", normalized)
		}
		w.Subdomain = normalized
	}
	w.UpdatedAt = time.Now().UTC()
	w.LastModified = w.UpdatedAt
	w.DraftRevision++
	if w.DraftRevision < 1 {
		w.DraftRevision = 1
	}
	_, err := r.db.Exec(ctx, `UPDATE user_websites SET
		template_id=NULLIF($3,'')::uuid, subdomain=$4, custom_domain=$5, pages=$6::jsonb,
		global_styles=$7::jsonb, navigation=$8::jsonb, footer=$9::jsonb, status=$10,
		published_at=$11, last_modified=$12, updated_at=$13, draft_revision=$14,
		custom_domain_status=$15, custom_domain_verification_token=$16, custom_domain_verified_at=$17
		WHERE id=$1 AND business_id=$2`,
		w.ID, w.BusinessID, w.TemplateID, w.Subdomain, w.CustomDomain, w.Pages, w.GlobalStyles,
		w.Navigation, w.Footer, w.Status, w.PublishedAt, w.LastModified, w.UpdatedAt,
		w.DraftRevision, w.CustomDomainStatus, w.CustomDomainVerificationToken, w.CustomDomainVerifiedAt)
	return err
}

func (r *Repository) DeleteWebsite(ctx context.Context, id, businessID string) error {
	result, err := r.db.Exec(ctx, `DELETE FROM user_websites WHERE id=$1 AND business_id=$2`, id, businessID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("website not found")
	}
	return nil
}

func validatePublishablePages(raw string) (string, error) {
	var pages []map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &pages); err != nil {
		return "", fmt.Errorf("website pages are invalid: %w", err)
	}
	if len(pages) == 0 {
		return "", fmt.Errorf("add at least one page before publishing")
	}
	hasHome := false
	for _, page := range pages {
		slug, _ := page["slug"].(string)
		if slug == "" || slug == "/" {
			hasHome = true
			page["slug"] = "/"
		}
		page["isPublished"] = true
	}
	if !hasHome {
		return "", fmt.Errorf("a home page with slug / is required")
	}
	encoded, err := json.Marshal(pages)
	return string(encoded), err
}

func (r *Repository) PublishWebsite(ctx context.Context, id, businessID string) (*UserWebsite, error) {
	w, err := r.GetWebsiteByIDAndBusiness(ctx, id, businessID)
	if err != nil {
		return nil, err
	}
	if w == nil {
		return nil, fmt.Errorf("website not found")
	}
	normalized, err := NormalizeSubdomain(w.Subdomain)
	if err != nil {
		return nil, err
	}
	available, _, err := r.IsSubdomainAvailable(ctx, normalized, w.ID)
	if err != nil {
		return nil, err
	}
	if !available {
		return nil, fmt.Errorf("subdomain %q is already in use", normalized)
	}
	publishedPages, err := validatePublishablePages(w.Pages)
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	publishedCustomDomain := ""
	if w.CustomDomainStatus == CustomDomainActive {
		publishedCustomDomain = w.CustomDomain
	}
	_, err = r.db.Exec(ctx, `UPDATE user_websites SET
		status=$3, published_at=$4, last_modified=$4, updated_at=$4, subdomain=$5,
		published_subdomain=$5, published_custom_domain=$6, published_pages=$7::jsonb,
		published_global_styles=global_styles, published_navigation=navigation, published_footer=footer,
		published_business_snapshot=(SELECT jsonb_build_object(
			'name', b.name, 'tagline', b.tagline, 'description', b.description,
			'industry', b.industry, 'location', b.location, 'brandKit', b.brand_kit
		) FROM businesses b WHERE b.id=user_websites.business_id),
		published_revision=draft_revision
		WHERE id=$1 AND business_id=$2`,
		id, businessID, StatusPublished, now, normalized, publishedCustomDomain, publishedPages)
	if err != nil {
		return nil, err
	}
	return r.GetWebsiteByIDAndBusiness(ctx, id, businessID)
}

func (r *Repository) UnpublishWebsite(ctx context.Context, id, businessID string) (*UserWebsite, error) {
	now := time.Now().UTC()
	result, err := r.db.Exec(ctx, `UPDATE user_websites SET status=$3, updated_at=$4 WHERE id=$1 AND business_id=$2`, id, businessID, StatusUnpublished, now)
	if err != nil {
		return nil, err
	}
	if result.RowsAffected() == 0 {
		return nil, fmt.Errorf("website not found")
	}
	return r.GetWebsiteByIDAndBusiness(ctx, id, businessID)
}

func randomVerificationToken() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "vm-verify-" + hex.EncodeToString(buf), nil
}

func (r *Repository) SetCustomDomain(ctx context.Context, id, businessID, domain, baseDomain string) (*UserWebsite, error) {
	w, err := r.GetWebsiteByIDAndBusiness(ctx, id, businessID)
	if err != nil || w == nil {
		if err == nil {
			err = fmt.Errorf("website not found")
		}
		return nil, err
	}
	normalized, err := NormalizeCustomDomain(domain, baseDomain)
	if err != nil {
		return nil, err
	}
	if normalized == "" {
		w.CustomDomain = ""
		w.CustomDomainStatus = CustomDomainNone
		w.CustomDomainVerificationToken = ""
		w.CustomDomainVerifiedAt = nil
		if err := r.UpdateWebsite(ctx, w); err != nil {
			return nil, err
		}
		return r.GetWebsiteByIDAndBusiness(ctx, id, businessID)
	}
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM user_websites WHERE LOWER(custom_domain)=LOWER($1) AND id<>$2)`, normalized, id).Scan(&exists); err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("custom domain is already connected to another VentureMate website")
	}
	token, err := randomVerificationToken()
	if err != nil {
		return nil, err
	}
	w.CustomDomain = normalized
	w.CustomDomainStatus = CustomDomainPending
	w.CustomDomainVerificationToken = token
	w.CustomDomainVerifiedAt = nil
	if err := r.UpdateWebsite(ctx, w); err != nil {
		return nil, err
	}
	return r.GetWebsiteByIDAndBusiness(ctx, id, businessID)
}

func verifyDNS(domain, token, target string) (bool, string) {
	target = strings.TrimSuffix(strings.ToLower(target), ".")
	if cname, err := net.LookupCNAME(domain); err == nil {
		cname = strings.TrimSuffix(strings.ToLower(cname), ".")
		if cname == target {
			return true, "CNAME"
		}
	}
	if records, err := net.LookupTXT("_venturemate." + domain); err == nil {
		for _, record := range records {
			if strings.TrimSpace(record) == token {
				return true, "TXT"
			}
		}
	}
	return false, ""
}

func (r *Repository) VerifyCustomDomain(ctx context.Context, id, businessID, target string) (*UserWebsite, error) {
	w, err := r.GetWebsiteByIDAndBusiness(ctx, id, businessID)
	if err != nil || w == nil {
		if err == nil {
			err = fmt.Errorf("website not found")
		}
		return nil, err
	}
	if w.CustomDomain == "" || w.CustomDomainVerificationToken == "" {
		return nil, fmt.Errorf("connect a custom domain first")
	}
	verified, _ := verifyDNS(w.CustomDomain, w.CustomDomainVerificationToken, target)
	if !verified {
		w.CustomDomainStatus = CustomDomainFailed
		_ = r.UpdateWebsite(ctx, w)
		return nil, fmt.Errorf("DNS verification failed; add the CNAME or TXT record and try again")
	}
	now := time.Now().UTC()
	w.CustomDomainStatus = CustomDomainActive
	w.CustomDomainVerifiedAt = &now
	if err := r.UpdateWebsite(ctx, w); err != nil {
		return nil, err
	}
	return r.GetWebsiteByIDAndBusiness(ctx, id, businessID)
}

func (r *Repository) GetPublishedByHost(ctx context.Context, host, baseDomain string) (*PublicWebsite, error) {
	host = strings.ToLower(strings.TrimSuffix(strings.TrimSpace(host), "."))
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	var subdomain string
	if suffix := "." + strings.ToLower(baseDomain); strings.HasSuffix(host, suffix) {
		subdomain = strings.TrimSuffix(host, suffix)
		if strings.Contains(subdomain, ".") {
			return nil, nil
		}
	}

	query := `SELECT ` + publicWebsiteColumns + `,
		COALESCE(NULLIF(w.published_business_snapshot->>'name',''), b.name),
		COALESCE(w.published_business_snapshot->>'tagline', b.tagline),
		COALESCE(w.published_business_snapshot->>'description', b.description),
		COALESCE(w.published_business_snapshot->>'industry', b.industry),
		COALESCE(w.published_business_snapshot->>'location', b.location),
		COALESCE(w.published_business_snapshot->'brandKit', b.brand_kit)::text
		FROM user_websites w JOIN businesses b ON b.id=w.business_id
		WHERE w.status='published' AND b.status <> 'archived' AND (
			($1 <> '' AND LOWER(w.published_subdomain)=LOWER($1)) OR
			($2 <> '' AND LOWER(w.published_custom_domain)=LOWER($2))
		) LIMIT 1`

	row := r.db.QueryRow(ctx, query, subdomain, host)
	var result PublicWebsite
	var w UserWebsite
	if err := row.Scan(
		&w.ID, &w.BusinessID, &w.TemplateID, &w.Subdomain, &w.CustomDomain,
		&w.Pages, &w.GlobalStyles, &w.Navigation, &w.Footer, &w.Status, &w.PublishedAt, &w.LastModified,
		&w.PublishedSubdomain, &w.PublishedCustomDomain, &w.PublishedPages,
		&w.PublishedGlobalStyles, &w.PublishedNavigation, &w.PublishedFooter, &w.PublishedBusinessSnapshot,
		&w.DraftRevision, &w.PublishedRevision, &w.CustomDomainStatus,
		&w.CustomDomainVerificationToken, &w.CustomDomainVerifiedAt, &w.CreatedAt, &w.UpdatedAt,
		&result.BusinessName, &result.BusinessTagline, &result.BusinessDescription,
		&result.BusinessIndustry, &result.BusinessLocation, &result.BusinessBrandKit,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	result.Website = w
	return &result, nil
}

func (r *Repository) IsDomainAllowed(ctx context.Context, host, baseDomain string) (bool, error) {
	site, err := r.GetPublishedByHost(ctx, host, baseDomain)
	return site != nil, err
}

func (r *Repository) ListContactSubmissions(ctx context.Context) (string, error) {
	rows, err := r.db.Query(ctx, `SELECT id, website_id, business_id, name, email, phone, company, message, status, created_at
		FROM website_contact_submissions ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		return "[]", err
	}
	defer rows.Close()
	type sub struct {
		ID         string `json:"id"`
		Name       string `json:"name"`
		Email      string `json:"email"`
		Phone      string `json:"phone"`
		Company    string `json:"company"`
		Message    string `json:"message"`
		Status     string `json:"status"`
		CreatedAt  string `json:"createdAt"`
	}
	var subs []sub
	for rows.Next() {
		var s sub
		var createdAt string
		if err := rows.Scan(&s.ID, &s.Name, &s.Email, &s.Phone, &s.Company, &s.Message, &s.Status, &createdAt); err != nil {
			continue
		}
		s.CreatedAt = createdAt
		subs = append(subs, s)
	}
	if subs == nil {
		return "[]", nil
	}
	out, _ := json.Marshal(subs)
	return string(out), nil
}

func (r *Repository) DeleteContactSubmission(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM website_contact_submissions WHERE id = $1`, id)
	return err
}

func (r *Repository) SaveContactSubmission(ctx context.Context, submission ContactSubmission) error {
	if strings.TrimSpace(submission.Email) == "" && strings.TrimSpace(submission.Message) == "" {
		return fmt.Errorf("email or message is required")
	}
	metadata, _ := json.Marshal(submission.Metadata)
	_, err := r.db.Exec(ctx, `INSERT INTO website_contact_submissions
		(id, website_id, business_id, name, email, phone, company, message, metadata)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`, uuid.New().String(), submission.WebsiteID,
		submission.BusinessID, submission.Name, submission.Email, submission.Phone,
		submission.Company, submission.Message, string(metadata))
	return err
}

func PublishedPageSlugs(raw string) []string {
	var pages []map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &pages); err != nil {
		return nil
	}
	var slugs []string
	for _, page := range pages {
		slug, _ := page["slug"].(string)
		if slug == "" {
			slug = "/"
		}
		slugs = append(slugs, slug)
	}
	sort.Strings(slugs)
	return slugs
}
