package runner

import (
	
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"oa-practice-platform/models"
)

func RunCPP(code string, q *models.Question) models.RunResponse {
	testCases := append(q.TestCases, q.HiddenTestCases...)
	numVisible := len(q.TestCases)
	
	mainInjection, ok := q.MainInjections["cpp"]
	if !ok {
		return models.RunResponse{Passed: false, Message: "Missing main injection for cpp in question definition"}
	}
	fullCode := code + "\n" + mainInjection

	tmpCodeFile, err := os.CreateTemp("", "run-*.cpp")
	if err != nil {
		return models.RunResponse{Passed: false, Message: "Failed to create temp cpp file"}
	}
	defer os.Remove(tmpCodeFile.Name())

	if _, err := tmpCodeFile.Write([]byte(fullCode)); err != nil {
		return models.RunResponse{Passed: false, Message: "Failed to write temp cpp file"}
	}
	tmpCodeFile.Close()

	scriptPath, _ := filepath.Abs(filepath.Join("..", "scripts", "run_cpp.sh"))

	var results []models.TestCaseResult
	passedAll := true

	for i, tc := range testCases {
		isHidden := i >= numVisible

		tmpInputFile, err := os.CreateTemp("", "input-*.txt")
		if err != nil {
			return models.RunResponse{Passed: false, Message: "Failed to create temp input file"}
		}
		tmpInputFile.Write([]byte(tc.Input))
		tmpInputFile.Close()
		defer os.Remove(tmpInputFile.Name())

		cmd := exec.Command("bash", scriptPath, tmpCodeFile.Name(), tmpInputFile.Name())
		out, _ := cmd.CombinedOutput()
		actualOutput := strings.TrimSpace(string(out))
		expectedOutput := strings.TrimSpace(tc.ExpectedOutput)

		testPassed := (actualOutput == expectedOutput)
		if !testPassed {
			passedAll = false
		}

		res := models.TestCaseResult{
			Passed:   testPassed,
			IsHidden: isHidden,
		}

		if !isHidden {
			res.Input = tc.Input
			res.ExpectedOutput = expectedOutput
			res.ActualOutput = actualOutput
		}
		results = append(results, res)
	}

	return models.RunResponse{Passed: passedAll, Message: "", Results: results}
}
