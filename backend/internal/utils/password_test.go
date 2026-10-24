package utils

import (
	"fmt"
	"testing"
)

func TestHashPassword(t *testing.T) {
	hash, err := HashPassword("password123")
	if err != nil {
		t.Fatal(err)
	}
	fmt.Println("HASH_PASSWORD123:", hash)
	if !CheckPasswordHash("password123", hash) {
		t.Fatal("Password check failed")
	}
}
