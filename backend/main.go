package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

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

		resp := runCode(req.Code, req.Language, question)

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

func runCode(code, lang string, q *Question) RunResponse {
	testCases := append(q.TestCases, q.HiddenTestCases...)

	if lang == "cpp" {
		mainInjection := `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>

int main() {
    std::string arr_str;
    std::cin >> arr_str;
    int target;
    std::cin >> target;
    
    if (arr_str.length() > 2) {
        arr_str = arr_str.substr(1, arr_str.length() - 2);
    } else {
        arr_str = "";
    }
    
    std::vector<int> nums;
    if (arr_str != "") {
        std::stringstream ss(arr_str);
        std::string token;
        while(std::getline(ss, token, ',')) {
            nums.push_back(std::stoi(token));
        }
    }
    
    Solution sol;
    std::vector<int> res = sol.twoSum(nums, target);
    if (res.size() >= 2) {
        std::cout << "[" << res[0] << "," << res[1] << "]" << std::endl;
    } else {
        std::cout << "[]" << std::endl;
    }
    return 0;
}
`
		fullCode := code + "\n" + mainInjection

		tmpCodeFile, err := ioutil.TempFile("", "run-*.cpp")
		if err != nil {
			return RunResponse{Passed: false, Message: "Failed to create temp cpp file"}
		}
		defer os.Remove(tmpCodeFile.Name())

		if _, err := tmpCodeFile.Write([]byte(fullCode)); err != nil {
			return RunResponse{Passed: false, Message: "Failed to write temp cpp file"}
		}
		tmpCodeFile.Close()

		scriptPath, _ := filepath.Abs(filepath.Join("..", "scripts", "run_cpp.sh"))

		var logs []string
		passed := true

		for i, tc := range testCases {
			tmpInputFile, err := ioutil.TempFile("", "input-*.txt")
			if err != nil {
				return RunResponse{Passed: false, Message: "Failed to create temp input file"}
			}
			tmpInputFile.Write([]byte(tc.Input))
			tmpInputFile.Close()
			defer os.Remove(tmpInputFile.Name())

			cmd := exec.Command("bash", scriptPath, tmpCodeFile.Name(), tmpInputFile.Name())
			out, _ := cmd.CombinedOutput()
			actualOutput := strings.TrimSpace(string(out))
			expectedOutput := strings.TrimSpace(tc.ExpectedOutput)

			if actualOutput != expectedOutput {
				passed = false
				logs = append(logs, fmt.Sprintf("Test Case %d FAILED.\nInput:\n%s\nExpected:\n%s\nGot:\n%s\n", i+1, tc.Input, expectedOutput, actualOutput))
			} else {
				logs = append(logs, fmt.Sprintf("Test Case %d PASSED.", i+1))
			}
		}

		finalMsg := strings.Join(logs, "\n\n")
		return RunResponse{Passed: passed, Message: finalMsg}
	}

	if lang == "sql" {
		if database.Pool == nil {
			return RunResponse{Passed: false, Message: "Database connection not available to run SQL tests"}
		}

		var logs []string
		passed := true
		ctx := context.Background()

		for i, tc := range testCases {
			schemaId := fmt.Sprintf("test_schema_%d_%d", time.Now().UnixNano(), i)

			// 1. Create temporary schema
			_, err := database.Pool.Exec(ctx, fmt.Sprintf("CREATE SCHEMA %s", schemaId))
			if err != nil {
				return RunResponse{Passed: false, Message: fmt.Sprintf("Failed to create schema: %v", err)}
			}

			// Acquire a dedicated connection for the isolated test case context
			conn, err := database.Pool.Acquire(ctx)
			if err != nil {
				database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
				return RunResponse{Passed: false, Message: "Failed to acquire db connection"}
			}

			// Set search path strictly to the temporary schema
			_, err = conn.Exec(ctx, fmt.Sprintf("SET search_path TO %s", schemaId))
			if err != nil {
				conn.Release()
				database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
				return RunResponse{Passed: false, Message: "Failed to set search path"}
			}

			// Execute Table Schema creation
			if q.TablesSchema != nil {
				_, err = conn.Exec(ctx, *q.TablesSchema)
				if err != nil {
					conn.Release()
					database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
					return RunResponse{Passed: false, Message: fmt.Sprintf("Schema Error: %v", err)}
				}
			}

			// Execute Test Case Inputs (Mock data population)
			_, err = conn.Exec(ctx, tc.Input)
			if err != nil {
				conn.Release()
				database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
				return RunResponse{Passed: false, Message: fmt.Sprintf("Input Error: %v", err)}
			}

			// Execute User SQL Code
			rows, err := conn.Query(ctx, code)
			if err != nil {
				passed = false
				logs = append(logs, fmt.Sprintf("Test Case %d FAILED.\nQuery Error: %v", i+1, err))
				conn.Release()
				database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
				continue
			}

			// Read and format the output
			var actualOutputRows []string
			for rows.Next() {
				vals, _ := rows.Values()
				var sVals []string
				for _, v := range vals {
					sVals = append(sVals, fmt.Sprintf("%v", v))
				}
				actualOutputRows = append(actualOutputRows, strings.Join(sVals, ","))
			}
			rows.Close()

			actualOutput := strings.TrimSpace(strings.Join(actualOutputRows, "\n"))
			expectedOutput := strings.TrimSpace(tc.ExpectedOutput)

			if actualOutput != expectedOutput {
				passed = false
				logs = append(logs, fmt.Sprintf("Test Case %d FAILED.\nExpected:\n%s\nGot:\n%s\n", i+1, expectedOutput, actualOutput))
			} else {
				logs = append(logs, fmt.Sprintf("Test Case %d PASSED.", i+1))
			}

			// Cleanup
			conn.Release()
			database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
		}

		finalMsg := strings.Join(logs, "\n\n")
		return RunResponse{Passed: passed, Message: finalMsg}
	}

	if lang == "python" {
		return RunResponse{Passed: true, Message: "Python code executed successfully. (Mock)"}
	}

	return RunResponse{Passed: false, Message: "Unsupported language"}
}
