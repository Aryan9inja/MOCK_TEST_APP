package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSendSuccess(t *testing.T) {
	w := httptest.NewRecorder()
	data := map[string]string{"foo": "bar"}
	SendSuccess(w, data)

	res := w.Result()
	if res.StatusCode != http.StatusOK {
		t.Errorf("Expected status OK, got %v", res.StatusCode)
	}

	var response ApiResponse
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if !response.Success {
		t.Error("Expected success to be true")
	}

	dataMap, ok := response.Data.(map[string]interface{})
	if !ok || dataMap["foo"] != "bar" {
		t.Errorf("Expected data to contain foo=bar, got %v", response.Data)
	}
}

func TestSendError(t *testing.T) {
	w := httptest.NewRecorder()
	SendError(w, http.StatusBadRequest, "invalid request")

	res := w.Result()
	if res.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected status Bad Request, got %v", res.StatusCode)
	}

	var response ApiResponse
	if err := json.NewDecoder(res.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response.Success {
		t.Error("Expected success to be false")
	}

	if response.Error != "invalid request" {
		t.Errorf("Expected error 'invalid request', got %v", response.Error)
	}
}
