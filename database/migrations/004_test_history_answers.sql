-- +goose Up
ALTER TABLE test_history ADD COLUMN answers JSON NOT NULL DEFAULT '[]'::json;

-- +goose Down
ALTER TABLE test_history DROP COLUMN answers;
