FROM golang:1.25-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/graphql/ \
 && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/ai-worker ./cmd/ai-worker/

FROM alpine:3.22 AS runtime
WORKDIR /app
RUN apk add --no-cache ca-certificates nodejs npm tini \
 && addgroup -S venturemate && adduser -S venturemate -G venturemate \
 && mkdir -p /tmp/venturemate-builds && chown -R venturemate:venturemate /app /tmp/venturemate-builds
COPY --from=builder /out/server /out/ai-worker /app/
COPY --from=builder /app/config ./config
COPY --from=builder /app/internal/email/assets ./internal/email/assets
COPY --from=builder /app/internal/email/templates ./internal/email/templates
COPY --from=builder /app/migrations ./migrations
USER venturemate
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./server"]
