package appruntime

import "testing"

func TestAllowDefaultsDeny(t *testing.T) {
	t.Parallel()
	if allow(nil, "publicRead") {
		t.Fatal("nil entity must deny access")
	}
	if allow(&EntitySchema{}, "publicRead") {
		t.Fatal("missing permissions must deny access")
	}
	entity := &EntitySchema{Permissions: map[string]any{"publicRead": true, "publicCreate": false, "invalid": "true"}}
	if !allow(entity, "publicRead") {
		t.Fatal("explicit boolean true should permit access")
	}
	if allow(entity, "publicCreate") || allow(entity, "publicUpdate") || allow(entity, "invalid") {
		t.Fatal("false, missing, and non-boolean values must deny access")
	}
}

func TestHashAccessKeyIsDeterministicAndNonPlaintext(t *testing.T) {
	t.Parallel()
	first := HashAccessKey("public-project-key")
	second := HashAccessKey("public-project-key")
	if first != second {
		t.Fatal("access-key hashing must be deterministic")
	}
	if first == "public-project-key" || len(first) < 16 {
		t.Fatalf("access key was not safely hashed: %q", first)
	}
}
