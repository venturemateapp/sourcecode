package ai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestResponseTokenLimitDefaultsAndBounds(t *testing.T) {
	if got := responseTokenLimit(context.Background()); got != maxResponseTokens {
		t.Fatalf("default token limit = %d, want %d", got, maxResponseTokens)
	}
	if got := responseTokenLimit(withResponseTokenLimit(context.Background(), creativeResponseTokens)); got != creativeResponseTokens {
		t.Fatalf("creative token limit = %d, want %d", got, creativeResponseTokens)
	}
	if got := responseTokenLimit(withResponseTokenLimit(context.Background(), 1)); got != 128 {
		t.Fatalf("minimum clamp = %d, want 128", got)
	}
	max := maxContextTokens - systemPromptTokens - 256
	if got := responseTokenLimit(withResponseTokenLimit(context.Background(), 99999)); got != max {
		t.Fatalf("maximum clamp = %d, want %d", got, max)
	}
}

func TestOllamaUsesCreativeResponseLimit(t *testing.T) {
	var received ollamaRequest
	var decodeErr error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		decodeErr = json.NewDecoder(r.Body).Decode(&received)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"message":{"role":"assistant","content":"ok"}}`))
	}))
	defer server.Close()

	provider := newOllamaProvider(server.URL, "test-model")
	provider.client = server.Client()
	_, err := provider.Chat(
		withResponseTokenLimit(context.Background(), creativeResponseTokens),
		"system",
		[]Message{{Role: "user", Content: "make a website"}},
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	if decodeErr != nil {
		t.Fatal(decodeErr)
	}
	if got, ok := received.Options["num_predict"].(float64); !ok || int(got) != creativeResponseTokens {
		t.Fatalf("num_predict = %#v, want %d", received.Options["num_predict"], creativeResponseTokens)
	}
}

func TestTrimMessagesReservesCreativeOutputSpace(t *testing.T) {
	messages := []Message{
		{Role: "user", Content: strings.Repeat("x", 9000)},
		{Role: "assistant", Content: "recent"},
	}
	normal := trimMessages("system", messages, maxResponseTokens)
	creative := trimMessages("system", messages, creativeResponseTokens)
	if len(normal) < len(creative) {
		t.Fatalf("creative context retained more messages than normal: normal=%d creative=%d", len(normal), len(creative))
	}
	if got := creative[len(creative)-1].Content; got != "recent" {
		t.Fatalf("most recent message not retained: %q", got)
	}
}
