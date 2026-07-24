package services

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgtype"
	"oa-practice-platform/database"
	"oa-practice-platform/models"
	"oa-practice-platform/repositories"
)

func CreateTest(data string) (*repositories.Test, error) {
	queries := repositories.New(database.Pool)
	
	// Validate JSON format by unmarshaling to MockTest
	var mockTest models.MockTest
	if err := json.Unmarshal([]byte(data), &mockTest); err != nil {
		return nil, err
	}
	
	res, err := queries.CreateTest(context.Background(), []byte(data))
	if err != nil {
		return nil, err
	}
	
	return &res, nil
}

func ListTests() ([]repositories.ListTestsRow, error) {
	queries := repositories.New(database.Pool)
	return queries.ListTests(context.Background())
}

func GetTest(id string) (*models.MockTest, error) {
	queries := repositories.New(database.Pool)
	
	var uuid pgtype.UUID
	if err := uuid.Scan(id); err != nil {
		return nil, err
	}
	
	test, err := queries.GetTest(context.Background(), uuid)
	if err != nil {
		return nil, err
	}
	
	var mockTest models.MockTest
	if err := json.Unmarshal(test.Data, &mockTest); err != nil {
		return nil, err
	}
	return &mockTest, nil
}

func GetQuestionByID(testID, questionID string) (*models.Question, error) {
	test, err := GetTest(testID)
	if err != nil {
		return nil, err
	}
	for _, q := range test.Questions {
		if q.ID == questionID {
			return &q, nil
		}
	}
	return nil, nil
}

type AnswerPayload struct {
	QuestionID string `json:"question_id"`
	Code       string `json:"code"`
	Language   string `json:"language"`
}

type HistoryPayload struct {
	QuestionsSolved   int             `json:"questions_solved"`
	TotalQuestions    int             `json:"total_questions"`
	TimeTakenSeconds  int             `json:"time_taken_seconds"`
	TestCasesPassed   int             `json:"test_cases_passed"`
	TotalTestCases    int             `json:"total_test_cases"`
	Answers           []AnswerPayload `json:"answers"`
}

func CreateHistory(testID string, payload HistoryPayload) (*repositories.TestHistory, error) {
	queries := repositories.New(database.Pool)
	
	var uuid pgtype.UUID
	if err := uuid.Scan(testID); err != nil {
		return nil, err
	}
	
	answersBytes, _ := json.Marshal(payload.Answers)
	
	res, err := queries.CreateTestHistory(context.Background(), repositories.CreateTestHistoryParams{
		TestID:           uuid,
		QuestionsSolved:  int32(payload.QuestionsSolved),
		TotalQuestions:   int32(payload.TotalQuestions),
		TimeTakenSeconds: int32(payload.TimeTakenSeconds),
		TestCasesPassed:  int32(payload.TestCasesPassed),
		TotalTestCases:   int32(payload.TotalTestCases),
		Answers:          answersBytes,
	})
	if err != nil {
		return nil, err
	}
	return &res, nil
}

type HistoryResponse struct {
	ID               string          `json:"id"`
	TestID           string          `json:"test_id"`
	QuestionsSolved  int32           `json:"questions_solved"`
	TotalQuestions   int32           `json:"total_questions"`
	TimeTakenSeconds int32           `json:"time_taken_seconds"`
	TestCasesPassed  int32           `json:"test_cases_passed"`
	TotalTestCases   int32           `json:"total_test_cases"`
	CreatedAt        string          `json:"created_at"`
	Answers          []AnswerPayload `json:"answers"`
}

func ListHistory(testID string) ([]HistoryResponse, error) {
	queries := repositories.New(database.Pool)
	var uuid pgtype.UUID
	if err := uuid.Scan(testID); err != nil {
		return nil, err
	}
	
	histories, err := queries.ListTestHistory(context.Background(), uuid)
	if err != nil {
	    return nil, err
	}
	
	var res []HistoryResponse
	for _, h := range histories {
	    var parsedAnswers []AnswerPayload
	    if len(h.Answers) > 0 {
	        json.Unmarshal(h.Answers, &parsedAnswers)
	    }
	    
	    idStr := ""
	    if h.ID.Valid {
	        idBytes, _ := h.ID.Value()
	        idStr = idBytes.(string)
	    }
	    
	    testIdStr := ""
	    if h.TestID.Valid {
	        testIdBytes, _ := h.TestID.Value()
	        testIdStr = testIdBytes.(string)
	    }
	    
	    res = append(res, HistoryResponse{
	        ID: idStr,
	        TestID: testIdStr,
	        QuestionsSolved: h.QuestionsSolved,
	        TotalQuestions: h.TotalQuestions,
	        TimeTakenSeconds: h.TimeTakenSeconds,
	        TestCasesPassed: h.TestCasesPassed,
	        TotalTestCases: h.TotalTestCases,
	        CreatedAt: h.CreatedAt.Time.Format("2006-01-02T15:04:05Z07:00"),
	        Answers: parsedAnswers,
	    })
	}
	
	return res, nil
}
