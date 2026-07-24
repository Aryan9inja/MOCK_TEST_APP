export interface TestCase {
  input: string;
  expected_output: string;
}

export interface Question {
  id: string;
  title: string;
  statement: string;
  constraints: string;
  examples: { input: string; output: string }[];
  starter_code: string;
  func_signature: string | null;
  tables_schema: string | null;
  q_type: string;
  test_cases: TestCase[];
  hidden_test_cases: TestCase[];
}

export interface MockTest {
  id: string;
  title: string;
  time: number;
  questions: Question[];
}

export interface TestCaseResult {
  passed: boolean;
  is_hidden: boolean;
  input?: string;
  expected_output?: string;
  actual_output?: string;
  error?: string;
}

export interface RunResponse {
  passed: boolean;
  message: string;
  results: TestCaseResult[];
}
