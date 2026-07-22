package handlers

import (
	"encoding/json"
	"net/http"

	"oa-practice-platform/models"
	"oa-practice-platform/runner"
	"oa-practice-platform/services"
)

func GetQuestionsHandler(w http.ResponseWriter, r *http.Request) {
	qs, err := services.GetQuestions()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(qs)
}

func RunTestsHandler(w http.ResponseWriter, r *http.Request) {
	var req models.RunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	q, err := services.GetQuestionByID(req.QuestionID)
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
