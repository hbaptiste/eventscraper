package main

import (
	"dpatrov/scraper/api/v1"
	"fmt"
	"log"
	"os"
	"strconv"
)

func main() {
	portNumber := os.Getenv("API_BACKEND_PORT")

	uploadDir := "./uploads"
	err := os.MkdirAll(uploadDir, os.ModePerm)
	if err != nil {
		log.Fatalln("uploads folder can't be found")
	}

	if portNumber == "" {
		portNumber = "8080"
	}
	portInt, err := strconv.Atoi(portNumber)
	if err != nil {
		log.Fatalln("Error converting '%s': %v\n", portInt)
	}
	fmt.Printf("Port int %d!", portInt)
	api.StartApiServer(portInt)
}
