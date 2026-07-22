package runner

import (
	"oa-practice-platform/models"
)

func RunPython(code string, testCases []models.TestCase) models.RunResponse {
	return models.RunResponse{Passed: true, Message: "Python code executed successfully. (Mock)"}
}
