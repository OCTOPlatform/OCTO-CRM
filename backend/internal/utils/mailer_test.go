package utils

import (
	"os"
	"testing"
)

func TestGetFrontendURL(t *testing.T) {
	// 1. Default fallback when no env is set
	os.Unsetenv("FRONTEND_URL")
	os.Unsetenv("APP_URL")
	os.Unsetenv("NEXT_PUBLIC_APP_URL")
	if got := GetFrontendURL(); got != "http://localhost:3000" {
		t.Errorf("Expected default http://localhost:3000, got %s", got)
	}

	// 2. Custom FRONTEND_URL
	os.Setenv("FRONTEND_URL", "https://octo-crm.vercel.app")
	if got := GetFrontendURL(); got != "https://octo-crm.vercel.app" {
		t.Errorf("Expected https://octo-crm.vercel.app, got %s", got)
	}

	// 3. Trailing slash stripped
	os.Setenv("FRONTEND_URL", "https://octo-crm.vercel.app/")
	if got := GetFrontendURL(); got != "https://octo-crm.vercel.app" {
		t.Errorf("Expected https://octo-crm.vercel.app (no trailing slash), got %s", got)
	}

	// Cleanup
	os.Unsetenv("FRONTEND_URL")
}
