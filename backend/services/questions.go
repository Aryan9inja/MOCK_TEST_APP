package services

import (
	"encoding/json"
	"io/ioutil"
	"path/filepath"

	"oa-practice-platform/models"
)

func GetQuestions() ([]models.Question, error) {
	path := filepath.Join("..", "questions", "mock.json")
	file, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var qs []models.Question
	err = json.Unmarshal(file, &qs)
	return qs, err
}

func GetQuestionByID(id string) (*models.Question, error) {
	qs, err := GetQuestions()
	if err != nil {
		return nil, err
	}
	for _, q := range qs {
		if q.ID == id {
			return &q, nil
		}
	}
	return nil, nil
}
