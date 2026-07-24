package services

import (
	"encoding/json"
	"io/ioutil"
	"path/filepath"

	"oa-practice-platform/models"
)

func GetMockTest() (*models.MockTest, error) {
	path := filepath.Join("..", "questions", "mock.json")
	file, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var test models.MockTest
	err = json.Unmarshal(file, &test)
	return &test, err
}

func GetQuestionByID(id string) (*models.Question, error) {
	test, err := GetMockTest()
	if err != nil {
		return nil, err
	}
	for _, q := range test.Questions {
		if q.ID == id {
			return &q, nil
		}
	}
	return nil, nil
}
