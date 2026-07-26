package runner

import (
	"context"
	"fmt"
	"strings"
	"time"

	"oa-practice-platform/database"
	"oa-practice-platform/models"
)

func RunSQL(code string, q *models.Question) models.RunResponse {
	testCases := append(q.TestCases, q.HiddenTestCases...)
	tablesSchema := q.TablesSchema
	numVisible := len(q.TestCases)

	if database.Pool == nil {
		return models.RunResponse{Passed: false, Message: "Database connection not available to run SQL tests"}
	}

	var results []models.TestCaseResult
	passedAll := true
	ctx := context.Background()

	for i, tc := range testCases {
		isHidden := i >= numVisible
		schemaId := fmt.Sprintf("test_schema_%d_%d", time.Now().UnixNano(), i)

		res := models.TestCaseResult{
			IsHidden: isHidden,
		}

		if !isHidden {
			res.Input = tc.Input
			res.ExpectedOutput = strings.TrimSpace(tc.ExpectedOutput)
		}

		_, err := database.Pool.Exec(ctx, fmt.Sprintf("CREATE SCHEMA %s", schemaId))
		if err != nil {
			res.Passed = false
			res.Error = fmt.Sprintf("Failed to create schema: %v", err)
			results = append(results, res)
			passedAll = false
			continue
		}

		conn, err := database.Pool.Acquire(ctx)
		if err != nil {
			database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
			res.Passed = false
			res.Error = "Failed to acquire db connection"
			results = append(results, res)
			passedAll = false
			continue
		}

		_, err = conn.Exec(ctx, fmt.Sprintf("SET search_path TO %s", schemaId))
		if err != nil {
			conn.Exec(ctx, "RESET search_path")
			conn.Release()
			database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
			res.Passed = false
			res.Error = "Failed to set search path"
			results = append(results, res)
			passedAll = false
			continue
		}

		if tablesSchema != nil {
			_, err = conn.Exec(ctx, *tablesSchema)
			if err != nil {
				conn.Exec(ctx, "RESET search_path")
				conn.Release()
				database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
				res.Passed = false
				res.Error = fmt.Sprintf("Schema Error: %v", err)
				results = append(results, res)
				passedAll = false
				continue
			}
		}

		_, err = conn.Exec(ctx, tc.Input)
		if err != nil {
			conn.Exec(ctx, "RESET search_path")
			conn.Release()
			database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
			res.Passed = false
			res.Error = fmt.Sprintf("Input Error: %v", err)
			results = append(results, res)
			passedAll = false
			continue
		}

		rows, err := conn.Query(ctx, code)
		if err != nil {
			conn.Exec(ctx, "RESET search_path")
			conn.Release()
			database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
			res.Passed = false
			res.Error = fmt.Sprintf("Query Error: %v", err)
			results = append(results, res)
			passedAll = false
			continue
		}

		var actualOutputRows []string
		for rows.Next() {
			vals, _ := rows.Values()
			var sVals []string
			for _, v := range vals {
				sVals = append(sVals, fmt.Sprintf("%v", v))
			}
			actualOutputRows = append(actualOutputRows, strings.Join(sVals, ","))
		}
		rows.Close()

		actualOutput := strings.TrimSpace(strings.Join(actualOutputRows, "\n"))
		expectedOutput := strings.TrimSpace(tc.ExpectedOutput)

		normActual := strings.ReplaceAll(actualOutput, " ", "")
		normExpected := strings.ReplaceAll(expectedOutput, " ", "")
		testPassed := (normActual == normExpected)
		if !testPassed {
			passedAll = false
		}
		res.Passed = testPassed

		if !isHidden {
			res.ActualOutput = actualOutput
		}

		conn.Exec(ctx, "RESET search_path")
		conn.Release()
		database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
		
		results = append(results, res)
	}

	return models.RunResponse{Passed: passedAll, Message: "", Results: results}
}
