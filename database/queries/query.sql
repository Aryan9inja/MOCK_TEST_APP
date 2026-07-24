-- name: GetQuestion :one
SELECT * FROM questions
WHERE id = $1 LIMIT 1;

-- name: ListQuestions :many
SELECT * FROM questions
ORDER BY title;

-- name: InsertQuestion :one
INSERT INTO questions (
    id, title, difficulty, statement, constraints, examples, func_signature, tables_schema, q_type
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: CreateAttempt :one
INSERT INTO attempts (
    id, start_time, status
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: UpdateAttempt :exec
UPDATE attempts
SET end_time = $2, status = $3
WHERE id = $1;

-- name: GetAttempt :one
SELECT * FROM attempts
WHERE id = $1 LIMIT 1;

-- name: CreateResult :one
INSERT INTO results (
    id, attempt_id, question_id, code, language, passed, execution_time_ms, submission_time, output_log
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: ListResultsByAttempt :many
SELECT * FROM results
WHERE attempt_id = $1
ORDER BY submission_time ASC;

-- name: CreateTest :one
INSERT INTO tests (data) VALUES ($1) RETURNING *;

-- name: ListTests :many
SELECT 
    t.id, 
    t.created_at, 
    t.updated_at, 
    t.data->>'title' as title, 
    (t.data->>'time')::int as time,
    h.created_at as last_attempt_date
FROM tests t
LEFT JOIN LATERAL (
    SELECT created_at FROM test_history 
    WHERE test_id = t.id 
    ORDER BY created_at DESC LIMIT 1
) h ON true
ORDER BY t.created_at DESC;

-- name: GetTest :one
SELECT * FROM tests WHERE id = $1;

-- name: CreateTestHistory :one
INSERT INTO test_history (test_id, questions_solved, total_questions, time_taken_seconds, test_cases_passed, total_test_cases, answers)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: ListTestHistory :many
SELECT * FROM test_history WHERE test_id = $1 ORDER BY created_at DESC;
