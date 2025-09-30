package utils

import (
	"dpatrov/scraper/internal/gendb"
	"encoding/json"
	"net"
	"net/http"
	"path/filepath"
	"strconv"
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

func FixPriceValue(submissionData *gendb.FormSubmission) error {
	var data map[string]interface{}
	err := json.Unmarshal([]byte(submissionData.Data), &data)
	if err != nil {
		return err
	}
	if price, ok := data["price"]; ok {
		switch v := price.(type) {
		case float64:
			data["price"] = strconv.FormatFloat(v, 'f', 2, 64)
		}
	}
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil
	}
	submissionData.Data = string(jsonData)
	return nil
}
