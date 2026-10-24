# ==============================================================================
# Multi-stage Dockerfile for OCTO CRM Backend API (Golang)
# ==============================================================================

# Stage 1: Build binary
FROM golang:alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and migrations
COPY . .

# Compile static Linux binaries (stripped of debug symbols for minimal size)
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o bin/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o bin/migrate ./cmd/migrate

# Stage 2: Minimal Production Image (~25MB)
FROM alpine:3.20

WORKDIR /app

# Install security certificates & timezone data
RUN apk add --no-cache ca-certificates tzdata

ENV TZ=Asia/Jakarta

# Copy binaries and migration SQL files from builder stage
COPY --from=builder /app/bin/api ./bin/api
COPY --from=builder /app/bin/migrate ./bin/migrate
COPY --from=builder /app/migrations ./migrations

# Expose backend API port
EXPOSE 8080

# Auto-apply database migrations on startup, then start API server
CMD ["sh", "-c", "./bin/migrate -cmd up -dir ./migrations && ./bin/api"]
