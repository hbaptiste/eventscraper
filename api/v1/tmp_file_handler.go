package api

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type TmpFileServer struct {
	tmpDir string
}

func NewTmpFileServer(tmpDir string) *TmpFileServer {
	_, err := os.Open(tmpDir)
	if err != nil {
		os.MkdirAll(tmpDir, 0755)
	}
	return &TmpFileServer{tmpDir: tmpDir}
}
func (t *TmpFileServer) isValidFilename(filename string) bool {
	fmt.Printf("filename %s", filename)
	if strings.Contains(filename, "..") ||
		strings.Contains(filename, "/") ||
		strings.Contains(filename, "\\") {
		return false
	}
	validExts := []string{".jpg", ".jpeg", ".png", ".gif"}
	ext := strings.ToLower(filepath.Ext(filename))
	for _, validExt := range validExts {
		if ext == validExt {
			return true
		}
	}
	return false
}

func (t *TmpFileServer) ServeHandler(writer http.ResponseWriter, req *http.Request) {

	filename := strings.TrimPrefix(req.URL.Path, "/images/tmp/")
	if t.isValidFilename(filename) == false {
		http.Error(writer, "Invalid filename", http.StatusBadRequest)
		return
	}
	tmpPath := filepath.Join(t.tmpDir, filename)
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		writer.Header().Set("Content-Type", "image/jpeg")
	case ".png":
		writer.Header().Set("Content-Type", "image/png")
	case ".gif":
		writer.Header().Set("Content-Type", "image/gif")
	}
	http.ServeFile(writer, req, tmpPath)
}
