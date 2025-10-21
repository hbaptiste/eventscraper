package utils

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"
)

type Subscriber struct {
	url     *url.URL
	message chan Message
}

func (c Subscriber) Notify(message Message) {
	c.message <- message // will block
}

type Message struct {
	Kind    string `json:"kind"`
	Payload map[string]interface{}
}

type EventNotification struct {
	clientConnections map[string]Subscriber
	mu                sync.RWMutex
}

func NewEventNotication() *EventNotification {
	clientMap := make(map[string]Subscriber)
	return &EventNotification{
		clientConnections: clientMap,
	}
}

func (en *EventNotification) AddSubscriber(subscriber Subscriber) {
	en.mu.Lock()
	defer en.mu.Unlock()
	if _, ok := en.clientConnections[subscriber.url.String()]; ok {
		return
	}
	log.Printf("create user %s", subscriber.url.String())
	en.clientConnections[subscriber.url.String()] = subscriber
}

func (en *EventNotification) RemoveSubscriber(subscriber Subscriber) {
	en.mu.Lock()
	defer en.mu.Unlock()
	delete(en.clientConnections, subscriber.url.String())
	log.Printf("Client removed. Total clients: %d", len(en.clientConnections))
}

// create User on connection
func (en *EventNotification) Broadcast(message Message) {
	en.mu.Lock()
	defer en.mu.Unlock()
	for _, subscriber := range en.clientConnections {
		select {
		case subscriber.message <- message:
		default:
		}
	}
}
func (en *EventNotification) sseHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", os.Getenv("FRONT_URL")) // Or your specific origin
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("CacheControl", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	// sending events
	timer := time.NewTicker(time.Duration(time.Millisecond * 1))
	defer timer.Stop()
	// create a subscriber

	sub := Subscriber{url: r.URL, message: make(chan Message, 10)}
	en.AddSubscriber(sub)
	defer en.RemoveSubscriber(sub)

	// client disconnect
	ctx := r.Context()

	// Test
	en.Broadcast(Message{
		Kind: "STARTING",
		Payload: map[string]interface{}{
			"name":    "Indeed",
			"strange": "indeeed",
		},
	})

	for {
		select {
		case <-ctx.Done():
			return
		case event := <-sub.message:
			data, err := json.Marshal(event)
			if err != nil {
				log.Printf("Error marshaling event: %v", err)
				continue
			}
			fmt.Fprintf(w, "data: %s\n\n", data)
			w.(http.Flusher).Flush()
		case <-timer.C:
			fmt.Fprintf(w, ": kepalive\n\n")
			w.(http.Flusher).Flush()
		default:

		}
	}

}

// Start the stream server
func (en *EventNotification) Start(mux *http.ServeMux) {
	mux.HandleFunc("/events-notification", en.sseHandler)
	log.Printf("Starting sse server!")
}

func (en *EventNotification) Close() {
	en.mu.Lock()
	defer en.mu.Unlock()
}
