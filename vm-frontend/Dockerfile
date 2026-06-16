FROM node:22-alpine AS builder

ARG VITE_GRAPHQL_PROXY_URL
ARG VITE_AUTH_PROXY_URL

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