package runner

import (
	"bytes"
	"fmt"

	"os"
	"os/exec"
	"strings"

	"oa-practice-platform/models"
)

func RunPython(code string, q *models.Question) models.RunResponse {
	testCases := append(q.TestCases, q.HiddenTestCases...)

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

	tmpFile, err := os.CreateTemp("", "run-*.py")
	if err != nil {
		return models.RunResponse{Passed: false, Message: "Failed to create temp python file"}
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write([]byte(fullCode)); err != nil {
		return models.RunResponse{Passed: false, Message: "Failed to write temp python file"}
	}
	tmpFile.Close()

	var logs []string
	passed := true

	for i, tc := range testCases {
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
			passed = false
			logs = append(logs, fmt.Sprintf("Test Case %d FAILED.\nError:\n%s\nOutput:\n%s", i+1, errStr, actualOutput))
			continue
		}

		expectedOutput := strings.TrimSpace(tc.ExpectedOutput)

		if actualOutput != expectedOutput {
			passed = false
			logs = append(logs, fmt.Sprintf("Test Case %d FAILED.\nInput:\n%s\nExpected:\n%s\nGot:\n%s\n", i+1, tc.Input, expectedOutput, actualOutput))
		} else {
			logs = append(logs, fmt.Sprintf("Test Case %d PASSED.", i+1))
		}
	}

	finalMsg := strings.Join(logs, "\n\n")
	return models.RunResponse{Passed: passed, Message: finalMsg}
}
