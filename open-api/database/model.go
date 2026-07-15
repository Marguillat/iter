package database

import (
	"context"
	"fmt"
	"iter-api/utils"
	"os"
	"sync"

	"github.com/jackc/pgx/v5"
)

var lock = &sync.Mutex{}

type DBConnection struct {
	connectionString string
	CurrentConn      *pgx.Conn
}

var DB *DBConnection = nil

type Product struct {
	Id          string
	Passport_id string
	Name        string
	Titles      struct {
		EN string `json:"en"`
		FR string `json:"fr"`
	}
	Descriptions struct {
		EN string `json:"en"`
		FR string `json:"fr"`
	}
	Brand             string
	Sku               string
	Gtin              string
	Digital_link      string
	Granularity_level string
	Serial_number     string
	Color             string
	Size              string
}

func ConnectToDB() (*DBConnection, error) {
	if DB == nil {
		lock.Lock()
		defer lock.Unlock()

		if DB == nil {
			fmt.Println("making new connection")
			connectionString := os.Getenv("ITER_DATABASE_URL")

			// 1. Connect using a local variable first
			conn, err := pgx.Connect(context.Background(), connectionString)
			if err != nil {
				return nil, fmt.Errorf("unable to connect to database: %w", err)
			}

			// 2. Only populate the global singleton if connection succeeds
			DB = &DBConnection{
				connectionString: connectionString,
				CurrentConn:      conn,
			}
		}
	}
	return DB, nil
}

// defer conn.Close(context.Background())

func GetProductByGTIN(conn *pgx.Conn, gtin string) ([]Product, error) {
	passed, err := utils.CheckIsGTIN(&gtin)
	if err != nil {
		return nil, fmt.Errorf("Check GTIN format error: %v\n", err)
	}
	if !passed {
		return nil, fmt.Errorf("GTIN is not in the correct format")
	}

	formatedQuery := fmt.Sprintf(`SELECT * FROM dpp.products WHERE gtin = '%s'`, gtin)
	rows, err := conn.Query(
		context.Background(),
		formatedQuery,
	)
	products, err := pgx.CollectRows(rows, pgx.RowToStructByName[Product])
	if err != nil {
		return nil, fmt.Errorf("QueryRow failed: %v\n", err)
	}
	return products, nil
}
