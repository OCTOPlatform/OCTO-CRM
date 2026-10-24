package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type MigrationFile struct {
	Version int64
	Name    string
	Path    string
	Type    string // "up" or "down"
}

func main() {
	// Load .env if present
	_ = godotenv.Load()

	cmd := flag.String("cmd", "up", "Command to run: up, down, status")
	dir := flag.String("dir", "./migrations", "Path to migrations directory")
	dbURL := flag.String("db", "", "Database connection URL (defaults to DATABASE_URL env)")
	flag.Parse()

	connStr := *dbURL
	if connStr == "" {
		connStr = os.Getenv("DATABASE_URL")
	}
	if connStr == "" {
		// Default local development fallback
		connStr = "postgres://localhost:5432/octo_crm?sslmode=disable"
	}

	db, err := sqlx.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	if err := initSchemaMigrations(db); err != nil {
		log.Fatalf("Failed to init schema_migrations table: %v", err)
	}

	switch *cmd {
	case "up":
		if err := runUp(db, *dir); err != nil {
			log.Fatalf("Migration up failed: %v", err)
		}
		fmt.Println("All migrations applied successfully.")
	case "down":
		if err := runDown(db, *dir); err != nil {
			log.Fatalf("Migration down failed: %v", err)
		}
		fmt.Println("Rollback completed successfully.")
	case "status":
		if err := printStatus(db, *dir); err != nil {
			log.Fatalf("Failed to get status: %v", err)
		}
	default:
		log.Fatalf("Unknown command: %s. Use up, down, or status.", *cmd)
	}
}

func initSchemaMigrations(db *sqlx.DB) error {
	query := `
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version BIGINT PRIMARY KEY,
		dirty BOOLEAN NOT NULL DEFAULT FALSE,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);`
	_, err := db.Exec(query)
	return err
}

func loadMigrationFiles(dir string) ([]MigrationFile, error) {
	files, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var migrations []MigrationFile
	for _, f := range files {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".sql") {
			continue
		}

		parts := strings.Split(f.Name(), "_")
		if len(parts) < 2 {
			continue
		}

		version, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			continue
		}

		mType := "up"
		if strings.HasSuffix(f.Name(), ".down.sql") {
			mType = "down"
		} else if !strings.HasSuffix(f.Name(), ".up.sql") {
			continue
		}

		migrations = append(migrations, MigrationFile{
			Version: version,
			Name:    f.Name(),
			Path:    filepath.Join(dir, f.Name()),
			Type:    mType,
		})
	}

	sort.Slice(migrations, func(i, j int) bool {
		if migrations[i].Version == migrations[j].Version {
			return migrations[i].Type < migrations[j].Type
		}
		return migrations[i].Version < migrations[j].Version
	})

	return migrations, nil
}

func getAppliedVersions(db *sqlx.DB) (map[int64]bool, error) {
	applied := make(map[int64]bool)
	rows, err := db.Query("SELECT version FROM schema_migrations WHERE dirty = false")
	if err != nil {
		return applied, err
	}
	defer rows.Close()

	for rows.Next() {
		var v int64
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		applied[v] = true
	}
	return applied, nil
}

func runUp(db *sqlx.DB, dir string) error {
	migrations, err := loadMigrationFiles(dir)
	if err != nil {
		return err
	}

	applied, err := getAppliedVersions(db)
	if err != nil {
		return err
	}

	for _, m := range migrations {
		if m.Type != "up" || applied[m.Version] {
			continue
		}

		fmt.Printf("Applying migration [%06d] %s...\n", m.Version, m.Name)
		content, err := os.ReadFile(m.Path)
		if err != nil {
			return fmt.Errorf("reading file %s: %w", m.Path, err)
		}

		tx, err := db.Beginx()
		if err != nil {
			return err
		}

		if _, err := tx.Exec(string(content)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("executing migration %s: %w", m.Name, err)
		}

		if _, err := tx.Exec("INSERT INTO schema_migrations (version, dirty, applied_at) VALUES ($1, false, NOW()) ON CONFLICT (version) DO UPDATE SET dirty = false, applied_at = NOW()", m.Version); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("updating schema_migrations for %d: %w", m.Version, err)
		}

		if err := tx.Commit(); err != nil {
			return err
		}

		fmt.Printf("✓ Migration [%06d] %s applied successfully\n", m.Version, m.Name)
	}

	return nil
}

func runDown(db *sqlx.DB, dir string) error {
	migrations, err := loadMigrationFiles(dir)
	if err != nil {
		return err
	}

	applied, err := getAppliedVersions(db)
	if err != nil {
		return err
	}

	// Find the highest applied version
	var latestVersion int64 = -1
	for v := range applied {
		if v > latestVersion {
			latestVersion = v
		}
	}

	if latestVersion == -1 {
		fmt.Println("No applied migrations to rollback.")
		return nil
	}

	// Find down file for latestVersion
	var downFile *MigrationFile
	for _, m := range migrations {
		if m.Version == latestVersion && m.Type == "down" {
			downFile = &m
			break
		}
	}

	if downFile == nil {
		return fmt.Errorf("no down migration found for version %d", latestVersion)
	}

	fmt.Printf("Rolling back migration [%06d] %s...\n", downFile.Version, downFile.Name)
	content, err := os.ReadFile(downFile.Path)
	if err != nil {
		return fmt.Errorf("reading file %s: %w", downFile.Path, err)
	}

	tx, err := db.Beginx()
	if err != nil {
		return err
	}

	if _, err := tx.Exec(string(content)); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("executing rollback %s: %w", downFile.Name, err)
	}

	if _, err := tx.Exec("DELETE FROM schema_migrations WHERE version = $1", latestVersion); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("deleting schema_migrations record for %d: %w", latestVersion, err)
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	fmt.Printf("✓ Rolled back migration [%06d] %s successfully\n", downFile.Version, downFile.Name)
	return nil
}

func printStatus(db *sqlx.DB, dir string) error {
	migrations, err := loadMigrationFiles(dir)
	if err != nil {
		return err
	}

	applied, err := getAppliedVersions(db)
	if err != nil {
		return err
	}

	fmt.Println("Migration Status:")
	fmt.Println("-----------------------------------------------------------------")
	fmt.Printf("%-10s %-45s %-10s\n", "VERSION", "NAME", "STATUS")
	fmt.Println("-----------------------------------------------------------------")
	for _, m := range migrations {
		if m.Type != "up" {
			continue
		}
		status := "PENDING"
		if applied[m.Version] {
			status = "APPLIED"
		}
		fmt.Printf("%-10d %-45s %-10s\n", m.Version, m.Name, status)
	}
	return nil
}
