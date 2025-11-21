package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

const (
	appConfigDirName  = "llm-speed-test"
	appConfigFileName = "config.json"
)

// getConfigFilePath returns the full path to the app config file,
// creating the parent directory if needed.
func getConfigFilePath() (string, error) {
	configRoot, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("failed to resolve user config dir: %w", err)
	}

	appDir := filepath.Join(configRoot, appConfigDirName)
	if err := os.MkdirAll(appDir, 0o755); err != nil {
		return "", fmt.Errorf("failed to create app config dir: %w", err)
	}

	return filepath.Join(appDir, appConfigFileName), nil
}

// loadAppConfigFromDisk loads the AppConfig from disk if it exists.
// If the file does not exist, it returns an empty config and no error.
func loadAppConfigFromDisk() (*AppConfig, error) {
	path, err := getConfigFilePath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			// No config yet – start from defaults.
			return &AppConfig{}, nil
		}
		return nil, fmt.Errorf("failed to read app config: %w", err)
	}

	if len(data) == 0 {
		return &AppConfig{}, nil
	}

	var cfg AppConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse app config JSON: %w", err)
	}

	return &cfg, nil
}

// saveAppConfigToDisk writes the AppConfig to disk as JSON.
func saveAppConfigToDisk(cfg *AppConfig) error {
	if cfg == nil {
		return fmt.Errorf("app config is nil")
	}

	path, err := getConfigFilePath()
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal app config: %w", err)
	}

	// Use 0600 because the config may contain API keys.
	if err := os.WriteFile(path, data, 0o600); err != nil {
		return fmt.Errorf("failed to write app config: %w", err)
	}

	return nil
}

// GetAppConfig exposes the persisted configuration to the frontend.
func (a *App) GetAppConfig() (*AppConfig, error) {
	return loadAppConfigFromDisk()
}

// SaveAppConfig persists the given configuration to disk.
func (a *App) SaveAppConfig(cfg AppConfig) error {
	return saveAppConfigToDisk(&cfg)
}

