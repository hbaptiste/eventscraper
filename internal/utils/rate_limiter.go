package utils

import (
	"sync"
	"time"
)

type RateLimiter struct {
	requests map[string][]time.Time
	mu       sync.RWMutex
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   window,
	}

	go rl.cleanup()
	return rl
}
func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-rl.window)

	requests := rl.requests[ip]
	var validRequests []time.Time
	for _, req := range requests {
		if req.After(cutoff) {
			validRequests = append(validRequests, req)
		}
	}
	if len(validRequests) >= rl.limit {
		return false
	}
	validRequests = append(validRequests, now)
	rl.requests[ip] = validRequests
	return true

}
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for {
		select {
		case <-ticker.C:
			rl.mu.Lock()
			cuttoff := time.Now().Add(-rl.window)
			for ip, requests := range rl.requests {
				var validRequests []time.Time
				for _, req := range requests {
					if req.After(cuttoff) {
						validRequests = append(validRequests, req)
					}
				}
				if len(validRequests) == 0 {
					delete(rl.requests, ip)
				} else {
					rl.requests[ip] = validRequests
				}
			}
			rl.mu.Unlock()

		}
	}
}
