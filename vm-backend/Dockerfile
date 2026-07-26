FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -o server ./cmd/graphql/

FROM alpine:latest

WORKDIR /app

# Install Node.js 20 for building React projects
RUN apk add --no-cache ca-certificates nodejs npm

COPY --from=builder /app/server .
COPY --from=builder /app/config ./config
COPY --from=builder /app/internal/email/assets ./internal/email/assets
COPY --from=builder /app/internal/email/templates ./internal/email/templates
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080

CMD ["./server"]
