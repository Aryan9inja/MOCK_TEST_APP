package runner

import (
	"oa-practice-platform/models"
)

func RunCode(code, lang string, q *models.Question) models.RunResponse {
	testCases := append(q.TestCases, q.HiddenTestCases...)

	switch lang {
	case "cpp":
		return RunCPP(code, testCases)
	case "sql":
		return RunSQL(code, q.TablesSchema, testCases)
	case "python":
		return RunPython(code, testCases)
	default:
		return models.RunResponse{Passed: false, Message: "Unsupported language"}
	}
}
