package utils

import (
	"fmt"
	"regexp"
)

func CheckIsGTIN(s *string) (bool, error) {
	const gtinRegexp string = "^[0-9]{8,14}$"
	match, err := regexp.Match(gtinRegexp, []byte(*s))
	if err != nil {
		return false, fmt.Errorf("Fail matching regexp: %e\n", err)
	}
	return match, nil
}
