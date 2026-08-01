package s3

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
)

const maxRemoteUploadBytes = 25 << 20

type Service struct {
	client        *awss3.Client
	presign       *awss3.PresignClient
	bucket        string
	region        string
	endpoint      string
	publicBaseURL string
	http          *http.Client
}

func New(ctx context.Context) (*Service, error) {
	bucket := strings.TrimSpace(os.Getenv("S3_BUCKET"))
	if bucket == "" {
		return nil, fmt.Errorf("S3_BUCKET is required")
	}
	region := strings.TrimSpace(os.Getenv("S3_REGION"))
	if region == "" {
		region = "us-east-1"
	}
	endpoint := strings.TrimRight(strings.TrimSpace(os.Getenv("S3_ENDPOINT")), "/")
	publicBaseURL := strings.TrimRight(strings.TrimSpace(os.Getenv("S3_PUBLIC_BASE_URL")), "/")
	forcePathStyle, _ := strconv.ParseBool(strings.TrimSpace(os.Getenv("S3_FORCE_PATH_STYLE")))

	cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion(region))
	if err != nil {
		return nil, fmt.Errorf("unable to load AWS config: %w", err)
	}
	client := awss3.NewFromConfig(cfg, func(options *awss3.Options) {
		if endpoint != "" {
			options.BaseEndpoint = aws.String(endpoint)
		}
		options.UsePathStyle = forcePathStyle
	})
	return &Service{
		client: client, presign: awss3.NewPresignClient(client), bucket: bucket, region: region,
		endpoint: endpoint, publicBaseURL: publicBaseURL,
		http: &http.Client{Timeout: 60 * time.Second, CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			return nil
		}},
	}, nil
}

func (s *Service) Upload(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	if s == nil || s.client == nil {
		return "", fmt.Errorf("object storage is unavailable")
	}
	key = strings.TrimPrefix(path.Clean("/"+key), "/")
	if key == "" || key == "." || strings.HasPrefix(key, "../") {
		return "", fmt.Errorf("invalid storage key")
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	_, err := s.client.PutObject(ctx, &awss3.PutObjectInput{
		Bucket: aws.String(s.bucket), Key: aws.String(key), Body: bytes.NewReader(data), ContentType: aws.String(contentType),
		CacheControl: aws.String(cacheControlFor(contentType)),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}
	return s.GetPublicURL(key), nil
}

func cacheControlFor(contentType string) string {
	if strings.HasPrefix(contentType, "image/") || strings.Contains(contentType, "javascript") || strings.Contains(contentType, "css") || strings.Contains(contentType, "font") {
		return "public, max-age=31536000, immutable"
	}
	return "private, max-age=0, no-cache"
}

func (s *Service) UploadFromURL(ctx context.Context, sourceURL, key, contentType string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(sourceURL))
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return "", fmt.Errorf("only secure remote URLs are allowed")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsed.String(), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "VentureMate-Asset-Ingest/1.0")
	resp, err := s.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to download asset: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("bad status downloading asset: %d", resp.StatusCode)
	}
	limited := io.LimitReader(resp.Body, maxRemoteUploadBytes+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return "", err
	}
	if len(data) > maxRemoteUploadBytes {
		return "", fmt.Errorf("remote asset exceeds %d bytes", maxRemoteUploadBytes)
	}
	detected := http.DetectContentType(data)
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = detected
	}
	if !strings.HasPrefix(contentType, "image/") && !strings.HasPrefix(contentType, "application/pdf") && contentType != "image/svg+xml" {
		return "", fmt.Errorf("unsupported remote asset type %s", contentType)
	}
	return s.Upload(ctx, key, data, contentType)
}

func (s *Service) GetPublicURL(key string) string {
	key = strings.TrimPrefix(key, "/")
	if s.publicBaseURL != "" {
		return s.publicBaseURL + "/" + key
	}
	if s.endpoint != "" {
		return strings.TrimRight(s.endpoint, "/") + "/" + s.bucket + "/" + key
	}
	return fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.bucket, s.region, key)
}

func (s *Service) SignedDownloadURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	if expiry <= 0 || expiry > 24*time.Hour {
		expiry = 15 * time.Minute
	}
	result, err := s.presign.PresignGetObject(ctx, &awss3.GetObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(strings.TrimPrefix(key, "/"))}, func(options *awss3.PresignOptions) {
		options.Expires = expiry
	})
	if err != nil {
		return "", fmt.Errorf("failed to sign object URL: %w", err)
	}
	return result.URL, nil
}

func (s *Service) IsManagedURL(rawURL string) bool {
	if s == nil || s.bucket == "" {
		return false
	}
	return strings.HasPrefix(rawURL, s.GetPublicURL("")) || strings.Contains(rawURL, "/"+s.bucket+"/")
}

func (s *Service) SetPublicRead(ctx context.Context, key string) error {
	_, err := s.client.PutObjectAcl(ctx, &awss3.PutObjectAclInput{Bucket: aws.String(s.bucket), Key: aws.String(key), ACL: "public-read"})
	return err
}

func (s *Service) Delete(ctx context.Context, key string) (bool, error) {
	_, err := s.client.DeleteObject(ctx, &awss3.DeleteObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key)})
	if err != nil {
		return false, fmt.Errorf("failed to delete from S3: %w", err)
	}
	return true, nil
}

func (s *Service) Download(ctx context.Context, key string) ([]byte, string, error) {
	resp, err := s.client.GetObject(ctx, &awss3.GetObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key)})
	if err != nil {
		return nil, "", fmt.Errorf("failed to download from S3: %w", err)
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read S3 object: %w", err)
	}
	contentType := "application/octet-stream"
	if resp.ContentType != nil {
		contentType = *resp.ContentType
	}
	return data, contentType, nil
}

func GenerateKey(prefix, filename string) string {
	filename = strings.TrimSpace(strings.ReplaceAll(filename, "\\", "-"))
	filename = path.Base(filename)
	if filename == "." || filename == "" {
		filename = "asset"
	}
	return fmt.Sprintf("%s/%d-%s", strings.Trim(prefix, "/"), time.Now().UnixNano(), filename)
}
