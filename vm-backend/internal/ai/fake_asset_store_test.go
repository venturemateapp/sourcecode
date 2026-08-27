package ai

import (
	"context"
	"strings"
)

// fakeApprovedAssetStore is used by the website-assets tests. It records
// uploads (key + bytes + content type) and returns a durable URL under
// https://assets.example/ for each key.
type fakeApprovedAssetStore struct {
	uploads []fakeUpload
}

type fakeUpload struct {
	key         string
	contentType string
	data        []byte
}

func (f *fakeApprovedAssetStore) Upload(_ context.Context, key string, data []byte, contentType string) (string, error) {
	f.uploads = append(f.uploads, fakeUpload{key: key, contentType: contentType, data: data})
	return "https://assets.example/" + key, nil
}

func (f *fakeApprovedAssetStore) IsManagedURL(rawURL string) bool {
	return strings.HasPrefix(rawURL, "https://assets.example/")
}
