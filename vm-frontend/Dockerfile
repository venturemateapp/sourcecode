FROM node:22-alpine AS builder

ARG VITE_GRAPHQL_PROXY_URL
ARG VITE_AUTH_PROXY_URL
ARG VITE_PUBLIC_SITE_BASE_DOMAIN=venturemate.net
ARG VITE_PUBLIC_SITE_CNAME_TARGET=sites.venturemate.net

ENV VITE_PUBLIC_SITE_BASE_DOMAIN=$VITE_PUBLIC_SITE_BASE_DOMAIN
ENV VITE_PUBLIC_SITE_CNAME_TARGET=$VITE_PUBLIC_SITE_CNAME_TARGET

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM caddy:alpine

COPY --from=builder /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]