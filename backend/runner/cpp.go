package runner

import (
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"oa-practice-platform/models"
)

func RunCPP(code string, q *models.Question) models.RunResponse {
	testCases := append(q.TestCases, q.HiddenTestCases...)
	numVisible := len(q.TestCases)
	
	mainInjection := `
#include <iostream>
#include <vector>
#include <string>
#include <sstream>

int main() {
    std::string arr_str;
    std::cin >> arr_str;
    int target;
    std::cin >> target;
    
    if (arr_str.length() > 2) {
        arr_str = arr_str.substr(1, arr_str.length() - 2);
    } else {
        arr_str = "";
    }
    
    std::vector<int> nums;
    if (arr_str != "") {
        std::stringstream ss(arr_str);
        std::string token;
        while(std::getline(ss, token, ',')) {
            nums.push_back(std::stoi(token));
        }
    }
    
    Solution sol;
    std::vector<int> res = sol.twoSum(nums, target);
    if (res.size() >= 2) {
        std::cout << "[" << res[0] << "," << res[1] << "]" << std::endl;
    } else {
        std::cout << "[]" << std::endl;
    }
    return 0;
}
`
	fullCode := code + "\n" + mainInjection

	tmpCodeFile, err := ioutil.TempFile("", "run-*.cpp")
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

		tmpInputFile, err := ioutil.TempFile("", "input-*.txt")
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
