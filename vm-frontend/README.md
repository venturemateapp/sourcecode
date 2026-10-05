# VentureMate — Frontend

The VentureMate web app: a React + TypeScript single-page application built with Vite, including the
AI Studio (deck + asset generation), the site builder and the admin surfaces.

Package: `venturemate` · Node **22** · React + TypeScript · Vite

## Requirements

- **Node 22**
- A `.env` file — see *Configuration* below

## Configuration

Vite variables are read from the environment at **build time**:

```
VITE_GRAPHQL_URL           # the backend GraphQL endpoint
VITE_AUTH_SERVER_URL       # the auth service
VITE_GOOGLE_AUTH_URL       # Google OAuth entry
VITE_CALLBACK_URL          # OAuth redirect target
VITE_PUBLIC_SITE_BASE_DOMAIN    # default: venturemate.net
VITE_PUBLIC_SITE_CNAME_TARGET   # default: sites.venturemate.net
```

> ⚠️ **Never commit `.env`.** This repository is **public**. Only `VITE_*` values belong in it, and even
> those are **baked into the built bundle** — anyone can read them in the shipped JavaScript, so treat them
> as public. Nothing secret (tokens, keys, credentials) may go into a `VITE_*` variable: it would ship to
> every browser. If you ever commit a `.env`, rotate what's in it first — deleting the file does not remove
> it from history.

## Scripts

```bash
npm install

npm run dev        # Vite dev server on port 3000
npm run build      # tsc -b && vite build  ->  dist/
npm run preview    # serve the built bundle locally
npm run lint       # eslint .
```

## Running locally

From the repository root, `./run.sh` starts the backend and frontend together for local development
(backend **8080**, frontend **5173**). To run just the frontend, `npm run dev` serves it on **3000**.

## Verifying a change

```bash
npm run lint
npm run build      # the typecheck is part of this — `tsc -b` runs before Vite
```

There is currently **no test script** in `package.json`; verification is lint plus a production build.

## Docker

`Dockerfile` builds with `node:22-alpine` and serves the result behind Caddy:

- the `VITE_*` values are consumed as **build arguments** (`ARG` → `ENV`) — because they are compiled into
  the bundle, **changing them requires a rebuild**, not just a restart;
- `VITE_PUBLIC_SITE_BASE_DOMAIN` and `VITE_PUBLIC_SITE_CNAME_TARGET` have defaults in the Dockerfile
  (`venturemate.net` / `sites.venturemate.net`), the rest must be supplied at build time.

`docker-compose.yml` at the repo root defines the `frontend` service (container port `80`) on the shared
`vm-network`, and the local `Caddyfile` handles serving.

## Deployment

Production runs from the **`Production`** branch. Push to `Production`, then **rebuild** the image — a
restart alone will not pick up `VITE_*` changes or new code. Caddy fronts the app on the host.
