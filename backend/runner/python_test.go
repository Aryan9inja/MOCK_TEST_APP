package runner

import (
	"testing"
	"oa-practice-platform/models"
)

func TestPythonRunner(t *testing.T) {
	code := `
def solution(s):
    return "hello world"
`
	q := &models.Question{
		ID:    "1",
		Title: "Test Python",
		QType: "Python",
		MainInjections: map[string]string{
			"python": `
if __name__ == "__main__":
    import sys
    print(solution(sys.stdin.read().strip()))
`,
		},
		TestCases: []models.TestCase{
			{Input: "", ExpectedOutput: "hello world"},
		},
	}

	res := RunCode(code, "python", q)

	if !res.Passed {
		t.Errorf("Expected tests to pass, got failed: %v", res.Message)
	}

	if len(res.Results) != 1 {
		t.Fatalf("Expected 1 result, got %d", len(res.Results))
	}

	if !res.Results[0].Passed {
		t.Errorf("Expected test case 1 to pass, actual: %v, expected: %v", res.Results[0].ActualOutput, res.Results[0].ExpectedOutput)
	}
}
