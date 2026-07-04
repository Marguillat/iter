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
	currentConn      *pgx.Conn
}

var DB *DBConnection = nil

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
				currentConn:      conn,
			}
		}
	}
	return DB, nil
}

// defer conn.Close(context.Background())

// var greeting string
// err = conn.QueryRow(context.Background(), "select 'Hello, world!'").Scan(&greeting)
// if err != nil {
// 	fmt.Fprintf(os.Stderr, "QueryRow failed: %v\n", err)
// 	os.Exit(1)
// }
