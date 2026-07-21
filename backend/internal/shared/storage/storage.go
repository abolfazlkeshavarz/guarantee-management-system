package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

type FileInfo struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	MimeType string `json:"mime_type"`
	Size     int64  `json:"size"`
}

var uploadPath string

func Initialize(path string) error {
	uploadPath = path
	// Create base upload directory and subdirectories
	dirs := []string{
		path,
		filepath.Join(path, "invoices"),
		filepath.Join(path, "guarantee_cards"),
		filepath.Join(path, "reports"),
		filepath.Join(path, "repair_images"),
	}

	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}

	return nil
}

func SaveFile(file *multipart.FileHeader, subDir string) (*FileInfo, error) {
	// Validate file size (10MB default)
	if file.Size > 10*1024*1024 {
		return nil, fmt.Errorf("file size exceeds 10MB limit")
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Create subdirectory path
	dirPath := filepath.Join(uploadPath, subDir)
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create directory: %w", err)
	}

	// Full file path
	filePath := filepath.Join(dirPath, filename)

	// Save file
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %w", err)
	}
	defer dst.Close()

	if _, err = io.Copy(dst, src); err != nil {
		return nil, fmt.Errorf("failed to copy file: %w", err)
	}

	// Determine mime type
	mimeType := file.Header.Get("Content-Type")
	if mimeType == "" {
		// Fallback to extension-based detection
		switch strings.ToLower(ext) {
		case ".jpg", ".jpeg":
			mimeType = "image/jpeg"
		case ".png":
			mimeType = "image/png"
		case ".pdf":
			mimeType = "application/pdf"
		default:
			mimeType = "application/octet-stream"
		}
	}

	// Get relative path for database storage
	relativePath := filepath.Join(subDir, filename)

	return &FileInfo{
		Name:     file.Filename,
		Path:     relativePath,
		MimeType: mimeType,
		Size:     file.Size,
	}, nil
}

func DeleteFile(path string) error {
	fullPath := filepath.Join(uploadPath, path)
	if err := os.Remove(fullPath); err != nil {
		if os.IsNotExist(err) {
			return nil // File doesn't exist, consider it deleted
		}
		return fmt.Errorf("failed to delete file: %w", err)
	}
	return nil
}

func GetFilePath(path string) string {
	return filepath.Join(uploadPath, path)
}

func FileExists(path string) bool {
	fullPath := filepath.Join(uploadPath, path)
	_, err := os.Stat(fullPath)
	return err == nil
}
