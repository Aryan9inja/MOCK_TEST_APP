package handlers

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"sync"

	"github.com/go-chi/chi/v5"

	"oa-practice-platform/models"
	"oa-practice-platform/runner"
	"oa-practice-platform/services"
	"oa-practice-platform/api"
)

func ListTestsHandler(w http.ResponseWriter, r *http.Request) {
	tests, err := services.ListTests()
	if err != nil {
		api.SendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	api.SendSuccess(w, tests)
}

func CreateTestHandler(w http.ResponseWriter, r *http.Request) {
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		api.SendError(w, http.StatusBadRequest, err.Error())
		return
	}
	
	test, err := services.CreateTest(string(body))
	if err != nil {
		api.SendError(w, http.StatusBadRequest, "Invalid JSON format: "+err.Error())
		return
	}
	api.SendSuccess(w, test)
}

func GetTestHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	test, err := services.GetTest(id)
	if err != nil {
		api.SendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	api.SendSuccess(w, test)
}

func RunTestsHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.RunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.SendError(w, http.StatusBadRequest, err.Error())
		return
	}

	q, err := services.GetQuestionByID(id, req.QuestionID)
	if err != nil {
		api.SendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if q == nil {
		api.SendError(w, http.StatusNotFound, "Question not found")
		return
	}

	resp := runner.RunCode(req.Code, req.Language, q)
	api.SendSuccess(w, resp)
}

func SubmitTestHistoryHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req services.HistoryPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.SendError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Auto run all test cases concurrently and mark submission of questions
	var questionsSolved int
	var testCasesPassed int
	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, ans := range req.Answers {
		q, err := services.GetQuestionByID(id, ans.QuestionID)
		if err != nil || q == nil {
			continue // Skip if question not found
		}

		wg.Add(1)
		go func(answer services.AnswerPayload, question *models.Question) {
			defer wg.Done()
			resp := runner.RunCode(answer.Code, answer.Language, question)
			
			localPassed := 0
			for _, tcResult := range resp.Results {
				if tcResult.Passed {
					localPassed++
				}
			}

			mu.Lock()
			if resp.Passed {
				questionsSolved++
			}
			testCasesPassed += localPassed
			mu.Unlock()
		}(ans, q)
	}

	wg.Wait()

	req.QuestionsSolved = questionsSolved
	req.TestCasesPassed = testCasesPassed

	history, err := services.CreateHistory(id, req)
	if err != nil {
		api.SendError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.SendSuccess(w, history)
}

func GetTestHistoryHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	history, err := services.ListHistory(id)
	if err != nil {
		api.SendError(w, http.StatusInternalServerError, err.Error())
		return
	}
	api.SendSuccess(w, history)
}
