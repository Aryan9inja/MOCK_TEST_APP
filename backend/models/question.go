package models

type TestCase struct {
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected_output"`
}

type Question struct {
	ID              string     `json:"id"`
	Title           string     `json:"title"`
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

type MockTest struct {
	Title     string     `json:"title"`
	Time      int        `json:"time"`
	Questions []Question `json:"questions"`
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
