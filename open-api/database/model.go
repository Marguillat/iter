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

func ConnectToDB() *DBConnection {

	if DB == nil {
		lock.Lock()
		defer lock.Unlock()

		if DB == nil {
			fmt.Println("making new connection")
			DB = &DBConnection{
				connectionString: os.Getenv("ITER_DATABASE_URL"),
			}

			conn, err := pgx.Connect(context.Background(), DB.connectionString)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
				os.Exit(1)
			}
			DB.currentConn = conn
		}
	}
	return DB
}

// defer conn.Close(context.Background())

// var greeting string
// err = conn.QueryRow(context.Background(), "select 'Hello, world!'").Scan(&greeting)
// if err != nil {
// 	fmt.Fprintf(os.Stderr, "QueryRow failed: %v\n", err)
// 	os.Exit(1)
// }
