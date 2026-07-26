package runner

import (
	"bytes"
	
	"os"
	"os/exec"
	"strings"

	"oa-practice-platform/models"
)

func RunPython(code string, q *models.Question) models.RunResponse {
	testCases := append(q.TestCases, q.HiddenTestCases...)
	numVisible := len(q.TestCases)
	
	injection, ok := q.MainInjections["python"]
	if !ok {
		return models.RunResponse{Passed: false, Message: "Missing main injection for python in question definition"}
	}

	fullCode := code + "\n" + injection

	tmpFile, err := os.CreateTemp("", "run-*.py")
	if err != nil {
		return models.RunResponse{Passed: false, Message: "Failed to create temp python file"}
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write([]byte(fullCode)); err != nil {
		return models.RunResponse{Passed: false, Message: "Failed to write temp python file"}
	}
	tmpFile.Close()

	var results []models.TestCaseResult
	passedAll := true

	for i, tc := range testCases {
		isHidden := i >= numVisible
		res := models.TestCaseResult{
			IsHidden: isHidden,
		}

		if !isHidden {
			res.Input = tc.Input
			res.ExpectedOutput = strings.TrimSpace(tc.ExpectedOutput)
		}

		cmd := exec.Command("python3", tmpFile.Name())
		cmd.Stdin = strings.NewReader(tc.Input)
		
		var out bytes.Buffer
		var stderr bytes.Buffer
		cmd.Stdout = &out
		cmd.Stderr = &stderr
		
		err := cmd.Run()
		
		actualOutput := strings.TrimSpace(out.String())
		if err != nil {
			errStr := strings.TrimSpace(stderr.String())
			res.Passed = false
			passedAll = false
			if !isHidden {
				res.Error = errStr
				res.ActualOutput = actualOutput
			}
			results = append(results, res)
			continue
		}

		expectedOutput := strings.TrimSpace(tc.ExpectedOutput)
		testPassed := (actualOutput == expectedOutput)
		
		if !testPassed {
			passedAll = false
		}
		res.Passed = testPassed
		
		if !isHidden {
			res.ActualOutput = actualOutput
		}
		
		results = append(results, res)
	}

	return models.RunResponse{Passed: passedAll, Message: "", Results: results}
}
