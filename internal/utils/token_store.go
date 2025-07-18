package utils

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"sync"
	"time"
)

type CSRFTokenStore struct {
	tokens map[string]time.Time
	mu     sync.Mutex
}

var (
	tokenStoreInstance *CSRFTokenStore
	once               sync.Once
)

func GetCRSFTokenStore() *CSRFTokenStore {

	once.Do(func() {
		tokenStoreInstance = &CSRFTokenStore{
			tokens: make(map[string]time.Time),
		}
		go tokenStoreInstance.cleanup()
	})
	return tokenStoreInstance
}

func (s *CSRFTokenStore) GenerateToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	token := hex.EncodeToString(b)
	// save to store
	s.mu.Lock()
	s.tokens[token] = time.Now().Add(time.Hour)
	s.mu.Unlock()
	return token
}

func (s *CSRFTokenStore) ValidateToken(token string) bool {
	s.mu.Lock()
	expiry, exists := s.tokens[token]
	s.mu.Unlock()
	if !exists {
		log.Println("Token doesn't exist...")
	}
	if !exists || time.Now().After(expiry) {
		return false
	}

	s.mu.Lock()
	delete(s.tokens, token) //token was used
	s.mu.Unlock()

	return true
}

func (s *CSRFTokenStore) cleanup() {
	ticker := time.NewTicker(10 * time.Minute)
	select {
	case <-ticker.C:
		s.mu.Lock()
		now := time.Now()
		for token, expiry := range s.tokens {
			if now.After(expiry) {
				delete(s.tokens, token)
			}
		}
		s.mu.Unlock()
	}
}
