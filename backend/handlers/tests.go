package handlers

import (
	"encoding/json"
	"io/ioutil"
	"net/http"

	"github.com/go-chi/chi/v5"

	"oa-practice-platform/models"
	"oa-practice-platform/runner"
	"oa-practice-platform/services"
)

func ListTestsHandler(w http.ResponseWriter, r *http.Request) {
	tests, err := services.ListTests()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tests)
}

func CreateTestHandler(w http.ResponseWriter, r *http.Request) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	test, err := services.CreateTest(string(body))
	if err != nil {
		http.Error(w, "Invalid JSON format: " + err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(test)
}

func GetTestHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	test, err := services.GetTest(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(test)
}

func RunTestsHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.RunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	q, err := services.GetQuestionByID(id, req.QuestionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if q == nil {
		http.Error(w, "Question not found", http.StatusNotFound)
		return
	}

	resp := runner.RunCode(req.Code, req.Language, q)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func SubmitTestHistoryHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req services.HistoryPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	history, err := services.CreateHistory(id, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}

func GetTestHistoryHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	history, err := services.ListHistory(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}
