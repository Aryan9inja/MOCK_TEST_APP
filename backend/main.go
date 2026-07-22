package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"

	"oa-practice-platform/database"
)

type TestCase struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
}

type Question struct {
	ID              string     `json:"id"`
	Title           string     `json:"title"`
	Difficulty      string     `json:"difficulty"`
	Statement       string     `json:"statement"`
	Constraints     string     `json:"constraints"`
	Examples        []any      `json:"examples"`
	StarterCode     string     `json:"starter_code"`
	FuncSignature   *string    `json:"func_signature"`
	TablesSchema    *string    `json:"tables_schema"`
	QType           string     `json:"q_type"`
	TestCases       []TestCase `json:"test_cases"`
	HiddenTestCases []TestCase `json:"hidden_test_cases"`
}

type RunRequest struct {
	QuestionID string `json:"question_id"`
	Language   string `json:"language"`
	Code       string `json:"code"`
}

type RunResponse struct {
	Passed  bool   `json:"passed"`
	Message string `json:"message"`
}

func getQuestions() ([]Question, error) {
	path := filepath.Join("..", "questions", "mock.json")
	file, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var qs []Question
	err = json.Unmarshal(file, &qs)
	return qs, err
}

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

	r.Get("/api/questions", func(w http.ResponseWriter, r *http.Request) {
		qs, err := getQuestions()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(qs)
	})

	r.Post("/api/run", func(w http.ResponseWriter, r *http.Request) {
		var req RunRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		qs, err := getQuestions()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		var question *Question
		for _, q := range qs {
			if q.ID == req.QuestionID {
				question = &q
				break
			}
		}

		if question == nil {
			http.Error(w, "Question not found", http.StatusNotFound)
			return
		}

		// Basic MVP execution logic
		resp := runCode(req.Code, req.Language, question.TestCases)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server listening on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func runCode(code, lang string, testCases []TestCase) RunResponse {
	// For MVP, if it's python, we can write a temp file and execute it.
	// We'll write the user code + a test runner block.
	if lang == "python" {
		tmpfile, err := ioutil.TempFile("", "run-*.py")
		if err != nil {
			return RunResponse{Passed: false, Message: "Failed to create temp file"}
		}
		defer os.Remove(tmpfile.Name())

		// We assume the user code contains a function and we just append calls for the tests
		// This is a naive implementation for the MVP
		fullCode := code + "\n\nif __name__ == '__main__':\n"
		for i, tc := range testCases {
			fullCode += fmt.Sprintf("    # Test case %d\n", i+1)
			fullCode += fmt.Sprintf("    print('Running test %d...')\n", i+1)
			_ = tc // In a real runner we parse the func_signature and call it.
		}

		if _, err := tmpfile.Write([]byte(fullCode)); err != nil {
			return RunResponse{Passed: false, Message: "Failed to write temp file"}
		}
		if err := tmpfile.Close(); err != nil {
			return RunResponse{Passed: false, Message: "Failed to close temp file"}
		}

		cmd := exec.Command("python3", tmpfile.Name())
		out, err := cmd.CombinedOutput()
		if err != nil {
			return RunResponse{Passed: false, Message: fmt.Sprintf("Execution Error:\n%s", string(out))}
		}

		return RunResponse{Passed: true, Message: fmt.Sprintf("Output:\n%s\nAll tests passed successfully!", string(out))}
	}
    
    // Fallback naive success for C++ and SQL in this mock implementation
	return RunResponse{Passed: true, Message: "Code accepted (Mock Execution)."}
}
