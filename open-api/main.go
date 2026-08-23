package main

import (
	"fmt"
	"iter-api/database"
	"iter-api/utils"
	"log"

	"github.com/gofiber/contrib/v3/monitor"
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/gofiber/fiber/v3/middleware/logger"
)

func main() {
	// Initialize default config

	app := fiber.New()
	app.Use(logger.New())
	app.Use(cors.New())

	// Route de vérification de la santé et metrics
	app.Get("/health", healthcheck.New())
	app.Get("/metrics", monitor.New(monitor.Config{APIOnly: true}))

	// Route de base de l'API
	app.Get("/", func(c fiber.Ctx) error {
		return c.JSON(utils.DefaultMessage)
	})

	app.Get("/api", func(c fiber.Ctx) error {
		return c.JSON(utils.DefaultMessage)
	})

	app.Get("/api/dpp/:gtin?", func(c fiber.Ctx) error {

		switch {
		case c.Params("gtin") != "":
			DB, err := database.ConnectToDB()
			if err != nil {
				log.Printf("Error while connecting to db: %e", err)
				return c.Status(503).JSON(utils.InternalServerError)
			}
			getPassportResponse, err := database.GetProductByGTIN(DB.CurrentConn, c.Params("gtin"))
			if err != nil {
				log.Printf("Error while requesting passport to db: %e", err)
				return c.Status(503).JSON(utils.InternalServerError)
			}
			return c.JSON(getPassportResponse)
		default:
			return c.Status(404).JSON(utils.NoRouteMessage)
		}
	})

	// Démarrer le serveur sur le port 7000
	port := 7000
	log.Printf("Starting server on port %d...", port)
	log.Fatal(app.Listen(fmt.Sprintf(":%d", port)))
}
