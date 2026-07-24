package runner

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"strings"

	"oa-practice-platform/models"
)

func RunPython(code string, q *models.Question) models.RunResponse {
	testCases := append(q.TestCases, q.HiddenTestCases...)
	numVisible := len(q.TestCases)
	
	funcName := "solution" // Default
	if q.FuncSignature != nil {
		sig := *q.FuncSignature
		if strings.HasPrefix(sig, "def ") {
			parts := strings.Split(sig, "(")
			if len(parts) > 0 {
				nameParts := strings.Split(strings.TrimSpace(parts[0]), " ")
				if len(nameParts) == 2 {
					funcName = nameParts[1]
				}
			}
		}
	}

	injection := fmt.Sprintf(`
if __name__ == "__main__":
    import sys
    import ast
    
    input_data = sys.stdin.read().strip()
    
    try:
        parsed_input = ast.literal_eval(input_data)
    except:
        parsed_input = input_data
        
    try:
        if isinstance(parsed_input, tuple):
            res = %s(*parsed_input)
        else:
            res = %s(parsed_input)
            
        if isinstance(res, bool):
            print(str(res).lower())
        else:
            print(res)
    except Exception as e:
        print("RUNTIME_ERROR:", str(e))
`, funcName, funcName)

	fullCode := code + "\n" + injection

	tmpFile, err := ioutil.TempFile("", "run-*.py")
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
