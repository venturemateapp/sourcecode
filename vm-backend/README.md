# VentureMate — Backend

The VentureMate API: a GraphQL server plus the background AI worker that powers the AI Studio
(deck generation, asset/logo generation) and the site builder.

Module: `github.com/venturemate/vmbackend` · Go **1.25** · PostgreSQL **18**

## Layout

| Path | What it is |
|---|---|
| `cmd/graphql/` | The GraphQL API server — the main entrypoint |
| `cmd/ai-worker/` | Background worker for AI jobs (builds alongside the server in Docker) |
| `cmd/auth-server/` | OAuth / auth service |
| `cmd/server/` | Standalone server entrypoint |
| `cmd/test-email/` | Email smoke-test utility |
| `cmd/upload-logo/` | One-off logo upload utility |
| `internal/` | Domain packages — `ai`, `assetstudio`, `deckstudio`, `buildworker`, `recraft`, `netlify`, … |
| `graphql/`, `graph/` | gqlgen schema, generated models and resolvers (`gqlgen.yml` drives generation) |
| `migrations/` | 100 numbered schema migrations |
| `config/` | Configuration loading |

## Requirements

- **Go 1.25**
- **PostgreSQL 18**
- A `.env` file — see *Configuration* below

## Configuration

The server reads its configuration from the environment (a local `.env` is loaded in development).
Variable **names** in use:

```
PORT                    JWT_SECRET                OAUTH_REDIRECT_BASE
FRONTEND_URL            AI_PROVIDER               AI_ALLOW_PROVIDER_OVERRIDE
AI_FALLBACK_PROVIDERS   OPPER_API_KEY             OPPER_ENDPOINT
OPPER_MODEL             OPPER_BASE_URL            OPPER_IMAGE_MODEL
S3_BUCKET               S3_REGION                 AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY   PUBLIC_SITE_BASE_DOMAIN   PUBLIC_SITE_CNAME_TARGET
VM_GITHUB_TOKEN         NETLIFY_AUTH_TOKEN
```

> ⚠️ **Never commit `.env`.** This repository is **public**. A `.env` was once committed here and had to be
> treated as compromised — every value in it (AWS keys, `JWT_SECRET`, the GitHub and Netlify tokens, the
> Opper key) was rotated. Keep `.env` in `.gitignore` and load production values from the deployment
> environment instead. If you ever commit one by accident, **rotate the secrets first** — deleting the file
> does not remove it from history.

## AI providers

Both text and image/logo generation go through the **Opper gateway** on a single key (`OPPER_API_KEY`) —
`openai/gpt-5` for chat and `openai/gpt-image-2.5-flare` for images. DeepSeek and Recraft were removed as
separate providers. Images come back as base64, are wrapped as data URIs and persisted to S3 under
`assetstudio`. Note that **SVG vector logos are no longer produced** — GPT-Image returns raster PNG only.

## Database

Migrations live in `migrations/` as numbered `NNNNNN_name.up.sql` / `.down.sql` pairs (golang-migrate
convention), 100 files in total. The server does **not** run them at startup — apply them with the
`migrate` CLI against the target database before starting a new build, and check `schema_migrations`
afterwards to confirm the expected version.

## Running locally

```bash
cd vm-backend
go run ./cmd/graphql        # API server (PORT, default 8080)
go run ./cmd/ai-worker      # AI worker, in a second terminal
```

From the repository root, `./run.sh` starts the backend and frontend together for local development
(backend on **8080**, frontend on **5173**) and clears any stale listeners on those ports first.

## Verifying a change

```bash
cd vm-backend
go build ./...
go vet ./...
go test ./...
```

## Docker

`Dockerfile` is a two-stage build: `golang:1.25-alpine` compiles both `./cmd/graphql` (→ `/out/server`)
and `./cmd/ai-worker` (→ `/out/ai-worker`), and `alpine:3.22` runs them. `docker-compose.yml` at the repo
root defines the `backend` service (`8080`) and a `vm-network` network shared with the frontend.

## Deployment

Production runs from the **`Production`** branch. Caddy fronts the service; PostgreSQL 18 runs natively
on the host (not in a container). Push to `Production`, then rebuild and restart the service — and confirm
the process is actually up afterwards, since the DB and the app start independently.
