.PHONY: backend frontend migrate-up migrate-down migrate-status

# Database Migrations
migrate-up:
	cd backend && go run cmd/migrate/main.go -cmd up

migrate-down:
	cd backend && go run cmd/migrate/main.go -cmd down

migrate-status:
	cd backend && go run cmd/migrate/main.go -cmd status

# Backend API Server
backend:
	cd backend && go run cmd/api/main.go

# Frontend Next.js Dev Server
frontend:
	cd frontend && npm run dev

# Build both
build:
	cd backend && go build -v ./...
	cd frontend && npm run build

# WAHA WhatsApp Engine (Open-Source Local & Staging WhatsApp API)
waha-up:
	docker compose -f docker-compose.waha.yml up -d

waha-down:
	docker compose -f docker-compose.waha.yml down

waha-logs:
	docker compose -f docker-compose.waha.yml logs -f
