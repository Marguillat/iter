package main

import (
	"fmt"
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/static"
)

func main() {
	// Initialize default config
	app := fiber.New()
	app.Use(logger.New())

	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{"http://localhost", "http://localhost:80", "http://localhost:8080", "http://127.0.0.1", "http://swagger-ui:8080"},
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization", "X-API-Key"},
	}))

	// Route de vérification de la santé et documentation
	app.Get("/health", healthcheck.New())
	app.Get("/documentation", static.New("./specification.yml"))
	// Route de base de l'API
	app.Get("/api", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "Welcome to the open ITER dpp API",
			"version": "1.0.0",
		})
	})

	// Démarrer le serveur sur le port 3000
	port := 7000
	log.Printf("Starting server on port %d...", port)
	log.Fatal(app.Listen(fmt.Sprintf(":%d", port)))
}
