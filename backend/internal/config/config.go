package config

import (
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                   string
	DatabaseURL            string
	JWTSecret              string
	JWTExpiration          time.Duration
	Environment            string
	CORSOrigin             string
	WhatsAppBusinessNumber string
	WhatsAppVerifyToken    string
	WhatsAppToken          string
	WhatsAppPhoneNumberID  string
	WhatsAppGatewayURL     string
}

func Load() *Config {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://localhost:5432/octo_crm?sslmode=disable"
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "octo-crm-super-secret-jwt-key-2026"
	}

	origin := os.Getenv("CORS_ORIGIN")
	if origin == "" {
		origin = "*"
	}

	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}

	waNumber := os.Getenv("WHATSAPP_BUSINESS_NUMBER")
	if waNumber == "" {
		waNumber = "+6281295099738"
	}

	waVerifyToken := os.Getenv("WHATSAPP_VERIFY_TOKEN")
	if waVerifyToken == "" {
		waVerifyToken = "octo_crm_whatsapp_verify_token"
	}

	return &Config{
		Port:                   port,
		DatabaseURL:            dbURL,
		JWTSecret:              secret,
		JWTExpiration:          7 * 24 * time.Hour,
		Environment:            env,
		CORSOrigin:             origin,
		WhatsAppBusinessNumber: waNumber,
		WhatsAppVerifyToken:    waVerifyToken,
		WhatsAppToken:          os.Getenv("WHATSAPP_TOKEN"),
		WhatsAppPhoneNumberID:  os.Getenv("WHATSAPP_PHONE_NUMBER_ID"),
		WhatsAppGatewayURL:     os.Getenv("WHATSAPP_GATEWAY_URL"),
	}
}
