package database

import (
	"context"
	"fmt"
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

func GetPassportByGTIN(conn *pgx.Conn) ([]Product, error) {
	// [TODO] voir https://stackoverflow.com/questions/61704842/how-to-scan-a-queryrow-into-a-struct-with-pgx
	rows, err := conn.Query(context.Background(),
		`
		SELECT * FROM dpp.products WHERE gtin = '884993074531'
		`,
	)
	products, err := pgx.CollectRows(rows, pgx.RowToStructByName[Product])
	if err != nil {
		return nil, fmt.Errorf("QueryRow failed: %v\n", err)
	}
	return products, nil
}
