package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// bump_version is a small helper to keep the app version in sync
// between the Go backend and the package.json files.
//
// Usage (from repo root):
//   go run ./tools/bump_version.go v0.4
//   go run ./tools/bump_version.go 0.4.1
//
// The script will:
//   - Update the appVersion constant in app.go (displayed as "v<major>.<minor>")
//   - Update "version" in package.json and frontend/package.json (semver: major.minor.patch)
func main() {
	if len(os.Args) != 2 {
		fmt.Fprintln(os.Stderr, "Usage: go run ./tools/bump_version.go <version>")
		fmt.Fprintln(os.Stderr, "  e.g. go run ./tools/bump_version.go v0.4 or 0.4.1")
		os.Exit(1)
	}

	rawVersion := strings.TrimSpace(os.Args[1])
	npmVersion, appLabelVersion, err := deriveVersions(rawVersion)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}

	root, err := os.Getwd()
	if err != nil {
		fmt.Fprintln(os.Stderr, "Error: failed to get working directory:", err)
		os.Exit(1)
	}

	if err := updateAppVersion(root, appLabelVersion); err != nil {
		fmt.Fprintln(os.Stderr, "Error updating app.go:", err)
		os.Exit(1)
	}
	if err := updateRootPackageJSON(root, npmVersion); err != nil {
		fmt.Fprintln(os.Stderr, "Error updating package.json:", err)
		os.Exit(1)
	}
	if err := updateFrontendPackageJSON(root, npmVersion); err != nil {
		fmt.Fprintln(os.Stderr, "Error updating frontend/package.json:", err)
		os.Exit(1)
	}

	fmt.Printf("Version updated successfully:\n  app.go: %s\n  package.json: %s\n  frontend/package.json: %s\n",
		appLabelVersion, npmVersion, npmVersion)
}

// deriveVersions normalises the input into:
//   - npmVersion:   full semver "major.minor.patch" (for package.json)
//   - appLabel:     "v<major>.<minor>" (for display in the app)
//
// Examples:
//   "v0.3"   -> npmVersion "0.3.0", appLabel "v0.3"
//   "0.3.1"  -> npmVersion "0.3.1", appLabel "v0.3"
//   "1"      -> npmVersion "1.0.0", appLabel "v1.0"
func deriveVersions(raw string) (string, string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", "", errors.New("version cannot be empty")
	}

	normalized := strings.TrimPrefix(raw, "v")
	if normalized == "" {
		return "", "", fmt.Errorf("invalid version %q", raw)
	}

	parts := strings.Split(normalized, ".")
	for len(parts) < 3 {
		parts = append(parts, "0")
	}

	// Basic numeric validation to avoid obviously bad inputs.
	for _, p := range parts {
		if p == "" {
			return "", "", fmt.Errorf("invalid version component in %q", raw)
		}
		for _, r := range p {
			if r < '0' || r > '9' {
				return "", "", fmt.Errorf("version components must be numeric: %q", raw)
			}
		}
	}

	npmVersion := strings.Join(parts[:3], ".")

	major := parts[0]
	minor := "0"
	if len(parts) > 1 && parts[1] != "" {
		minor = parts[1]
	}
	appLabel := fmt.Sprintf("v%s.%s", major, minor)

	return npmVersion, appLabel, nil
}

func updateAppVersion(root, appLabel string) error {
	path := filepath.Join(root, "app.go")
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	re := regexp.MustCompile(`appVersion\s*=\s*\"[^\"]*\"`)
	if !re.Match(data) {
		return fmt.Errorf("appVersion constant not found in %s", path)
	}

	replacement := fmt.Sprintf(`appVersion       = "%s"`, appLabel)
	updated := re.ReplaceAll(data, []byte(replacement))

	return os.WriteFile(path, updated, 0o644)
}

func updateRootPackageJSON(root, npmVersion string) error {
	path := filepath.Join(root, "package.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	type RootPackage struct {
		Private bool   `json:"private"`
		Name    string `json:"name"`
		Version string `json:"version"`
	}

	var pkg RootPackage
	if err := json.Unmarshal(data, &pkg); err != nil {
		return fmt.Errorf("failed to parse %s: %w", path, err)
	}

	pkg.Version = npmVersion

	out, err := json.MarshalIndent(&pkg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal %s: %w", path, err)
	}
	out = append(out, '\n')

	return os.WriteFile(path, out, 0o644)
}

func updateFrontendPackageJSON(root, npmVersion string) error {
	path := filepath.Join(root, "frontend", "package.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	type FrontendPackage struct {
		Name            string            `json:"name"`
		Private         bool              `json:"private"`
		Version         string            `json:"version"`
		Type            string            `json:"type"`
		Scripts         map[string]string `json:"scripts"`
		Dependencies    map[string]string `json:"dependencies"`
		DevDependencies map[string]string `json:"devDependencies"`
	}

	var pkg FrontendPackage
	if err := json.Unmarshal(data, &pkg); err != nil {
		return fmt.Errorf("failed to parse %s: %w", path, err)
	}

	pkg.Version = npmVersion

	out, err := json.MarshalIndent(&pkg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal %s: %w", path, err)
	}
	out = append(out, '\n')

	return os.WriteFile(path, out, 0o644)
}

