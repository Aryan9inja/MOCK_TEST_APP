-- +goose Up
CREATE TABLE questions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    statement TEXT NOT NULL,
    constraints TEXT NOT NULL,
    examples JSONB NOT NULL,
    func_signature TEXT,
    tables_schema TEXT,
    q_type TEXT NOT NULL
);

CREATE TABLE attempts (
    id TEXT PRIMARY KEY,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status TEXT NOT NULL
);

CREATE TABLE results (
    id TEXT PRIMARY KEY,
    attempt_id TEXT NOT NULL REFERENCES attempts(id),
    question_id TEXT NOT NULL REFERENCES questions(id),
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    passed BOOLEAN NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    submission_time TIMESTAMP NOT NULL,
    output_log TEXT
);

-- +goose Down
DROP TABLE results;
DROP TABLE attempts;
DROP TABLE questions;
