package utils

import (
	"fmt"
	"regexp"

	"github.com/gofiber/fiber/v3"
)

// ---- constants ----
var DefaultMessage fiber.Map = fiber.Map{
	"status":   "ok",
	"messages": "Welcome to the open ITER dpp API. All routes start at the /api path. For more information see the swagger specification.",
	"version":  "1.0.0",
}

var NoRouteMessage fiber.Map = fiber.Map{
	"status":   "ok",
	"messages": "Nothing on this route, might be missing route path parameter. For more information see the swagger specification.",
	"version":  "1.0.0",
}

var InternalServerError fiber.Map = fiber.Map{
	"status":   "ko",
	"messages": "Internal server error, bruh",
	"version":  "1.0.0",
}

// ---- Functions ----
func CheckIsGTIN(s *string) (bool, error) {
	const gtinRegexp string = "^[0-9]{8,14}$"
	match, err := regexp.Match(gtinRegexp, []byte(*s))
	if err != nil {
		return false, fmt.Errorf("Fail matching regexp: %e\n", err)
	}
	return match, nil
}
