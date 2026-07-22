package runner

import (
	"oa-practice-platform/models"
)

func RunCode(code, lang string, q *models.Question) models.RunResponse {
	switch lang {
	case "cpp":
		return RunCPP(code, q)
	case "sql":
		return RunSQL(code, q)
	case "python":
		return RunPython(code, q)
	default:
		return models.RunResponse{Passed: false, Message: "Unsupported language"}
	}
}
