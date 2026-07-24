package main

import (
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"oa-practice-platform/database"
	"oa-practice-platform/handlers"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	if err := database.Connect(); err != nil {
		log.Println("Database connection skipped or failed:", err)
	} else {
		defer database.Close()
		log.Println("Connected to the database successfully.")
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"http://localhost:5173", "http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
	}))

	r.Get("/api/tests", handlers.ListTestsHandler)
	r.Post("/api/tests", handlers.CreateTestHandler)
	r.Get("/api/tests/{id}", handlers.GetTestHandler)
	r.Post("/api/tests/{id}/run", handlers.RunTestsHandler)
	r.Post("/api/tests/{id}/history", handlers.SubmitTestHistoryHandler)
	r.Get("/api/tests/{id}/history", handlers.GetTestHistoryHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server listening on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
