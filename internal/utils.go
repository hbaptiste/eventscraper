package utils

import (
	"net"
	"net/http"
	"path/filepath"
	"strings"
)

func TransformPosterName(originalFilename string) string {
	ext := filepath.Ext(originalFilename)

	baseName := strings.TrimSuffix(originalFilename, ext)
	lowerBaseName := strings.ToLower(baseName)
	processedBaseName := strings.ReplaceAll(lowerBaseName, " ", "_")
	processedBaseName = strings.ReplaceAll(processedBaseName, "-", "_")
	newFilename := processedBaseName + ext
	return newFilename
}

func GetClientIP(r *http.Request) string {
	forwarded := r.Header.Get("X-Forwared-For")
	if forwarded != "" {
		return forwarded
	}
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	return ip

}
