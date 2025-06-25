package test

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httputil"
	"strings"
	"testing"
	"time"
)

func TestLogin(t *testing.T) {
	payload := strings.NewReader(`{"username":"admin","password":"password12"}`)
	url := fmt.Sprintf("%s%s", "http://localhost:8082", "/api/login")
	req, err := http.NewRequest(http.MethodPost, url, payload)
	if err != nil {
		t.Fatalf("Failed to create request :%v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// dump
	dump, _ := httputil.DumpRequestOut(req, true)
	t.Logf("Request details: %s", string(dump))

	client := &http.Client{
		Timeout: 5 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("Request failed %v", err)
	}
	defer resp.Body.Close()

	// status code
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status %d; got %d", http.StatusOK, resp.StatusCode)
	}
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("Failed ot read response body %v", err)
	}
	fmt.Printf("Body %v", string(body))
}
