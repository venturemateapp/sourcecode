# VentureMate — AI Provider Consolidation to Opper

## Problem statement
Switch the AI agent to the Opper AI gateway so ChatGPT (openai/gpt-5) is the base
model for all AI work — both text generation and image/logo generation — using a
single key (OPPER_API_KEY). Remove the need for Recraft and DeepSeek as separate
providers.

## Architecture
- Backend: Go (`vm-backend`), GraphQL, Postgres. Frontend: React + Vite (`vm-frontend`).
- Text AI: `internal/ai` ProviderManager → provider cascade. Now Opper only.
- Image/logo AI: `internal/recraft` client (package name kept to avoid churn) now
  calls Opper `POST /v3/images`.

## What changed (2026-06)
- `internal/ai/config.go`: provider manager now defaults to `opper`
  (OPPER_API_KEY / OPPER_ENDPOINT /v3/compat/chat/completions / OPPER_MODEL=openai/gpt-5).
  DeepSeek + OpenRouter removed as defaults.
- `internal/ai/provider.go`: added `opper` provider case (OpenAI-compatible);
  `omitTemperature` so GPT-5 reasoning models aren't sent a non-default temperature.
- `internal/recraft/recraft.go`: rewritten to call Opper images
  (model OPPER_IMAGE_MODEL=openai/gpt-image-2.5-flare). Project is zero-data-retention,
  so images return base64; client wraps them as `data:` URIs. Vectorize/SVG not
  supported (callers fall back gracefully).
- `internal/assetstudio/service.go`: `download()` now decodes `data:` URIs and
  uploads bytes to S3 for durable asset URLs. Source label "opper".
- `internal/aiworker/processor.go`: progress labels + source → "opper".
- `internal/buildworker/build.go`: `OPPER_` added to env-scrub blocklist.
- `.env.example` updated; gitignored `.env` created with the key for local run.
- Frontend `AIProviderContext.tsx`: provider label → "opper".

## Verified
- Live Opper chat (openai/gpt-5) → 200 OK.
- Live Opper image (gpt-image-2.5-flare) → base64 PNG; refactored client returns a
  valid data URI (go test against live API passed).
- `go build ./...`, `go vet ./...`, `go test ./internal/ai/...` all pass.

## Notes / backlog
- True SVG vector logos are no longer produced (GPT Image is raster PNG only).
- DB usage counters still named `recraft_images_*` (internal only; no migration).
- Deploy: set OPPER_API_KEY in production env (not committed).
