package runner

import (
	"context"
	"fmt"
	"strings"
	"time"

	"oa-practice-platform/database"
	"oa-practice-platform/models"
)

func RunSQL(code string, tablesSchema *string, testCases []models.TestCase) models.RunResponse {
	if database.Pool == nil {
		return models.RunResponse{Passed: false, Message: "Database connection not available to run SQL tests"}
	}

	var logs []string
	passed := true
	ctx := context.Background()

	for i, tc := range testCases {
		schemaId := fmt.Sprintf("test_schema_%d_%d", time.Now().UnixNano(), i)

		_, err := database.Pool.Exec(ctx, fmt.Sprintf("CREATE SCHEMA %s", schemaId))
		if err != nil {
			return models.RunResponse{Passed: false, Message: fmt.Sprintf("Failed to create schema: %v", err)}
		}

		conn, err := database.Pool.Acquire(ctx)
		if err != nil {
			database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
			return models.RunResponse{Passed: false, Message: "Failed to acquire db connection"}
		}

		_, err = conn.Exec(ctx, fmt.Sprintf("SET search_path TO %s", schemaId))
		if err != nil {
			conn.Release()
			database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
			return models.RunResponse{Passed: false, Message: "Failed to set search path"}
		}

		if tablesSchema != nil {
			_, err = conn.Exec(ctx, *tablesSchema)
			if err != nil {
				conn.Release()
				database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
				return models.RunResponse{Passed: false, Message: fmt.Sprintf("Schema Error: %v", err)}
			}
		}

		_, err = conn.Exec(ctx, tc.Input)
		if err != nil {
			conn.Release()
			database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
			return models.RunResponse{Passed: false, Message: fmt.Sprintf("Input Error: %v", err)}
		}

		rows, err := conn.Query(ctx, code)
		if err != nil {
			passed = false
			logs = append(logs, fmt.Sprintf("Test Case %d FAILED.\nQuery Error: %v", i+1, err))
			conn.Release()
			database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
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

		if actualOutput != expectedOutput {
			passed = false
			logs = append(logs, fmt.Sprintf("Test Case %d FAILED.\nExpected:\n%s\nGot:\n%s\n", i+1, expectedOutput, actualOutput))
		} else {
			logs = append(logs, fmt.Sprintf("Test Case %d PASSED.", i+1))
		}

		conn.Release()
		database.Pool.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", schemaId))
	}

	finalMsg := strings.Join(logs, "\n\n")
	return models.RunResponse{Passed: passed, Message: finalMsg}
}
