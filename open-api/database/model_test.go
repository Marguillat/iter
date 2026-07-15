package database

import (
	"errors"
	"os"
	"strings"
	"sync"
	"testing"
)

// Helper to reset the global state between independent test runs
func resetSingleton() {
	lock.Lock()
	defer lock.Unlock()
	DB = nil
}

// TestConnectToDB_Singleton ensures that concurrent calls safely return
// the exact same instance pointer (Thread-Safe Singleton)
func TestConnectToDB_Singleton(t *testing.T) {
	resetSingleton()

	// Setting a dummy connection string to allow the logic to run.
	os.Setenv("ITER_DATABASE_URL", "postgres://user:pass@localhost:5432/dbname")
	defer os.Unsetenv("ITER_DATABASE_URL")

	var wg sync.WaitGroup
	instances := make([]*DBConnection, 10)

	for i := range 10 {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			// We ignore the error here because we are strictly verifying
			// that the singleton pointer assignment behaves correctly.
			conn, _ := ConnectToDB()
			instances[index] = conn
		}(i)
	}
	wg.Wait()

	// Verify all goroutines received the exact same memory address
	firstInstance := instances[0]
	for i, v := range instances {
		if v != firstInstance {
			t.Errorf("Expected singleton instances to be identical, but index %d differed", i)
		}
	}
}

// TestConnectToDB_ErrorWrapping verifies that connection failures
// are wrapped cleanly using fmt.Errorf with %w instead of crashing.
func TestConnectToDB_ErrorWrapping(t *testing.T) {
	resetSingleton()

	// Provide an intentionally unreachable/bad connection string
	os.Setenv("ITER_DATABASE_URL", "postgres://invalid_user:bad_pass@127.0.0.1:9999/fake_db")
	defer os.Unsetenv("ITER_DATABASE_URL")

	_, err := ConnectToDB()

	// 1. Assert that an error actually returned
	if err == nil {
		t.Fatal("Expected an error from an invalid database connection, but got nil")
	}

	// 2. Assert your custom prefix is present
	expectedPrefix := "unable to connect to database:"
	if !strings.HasPrefix(err.Error(), expectedPrefix) {
		t.Errorf("Expected error to start with %q, but got %q", expectedPrefix, err.Error())
	}

	// 3. Assert that %w worked by checking if the error can unwrap
	// or if it still contains underlying details (like connection refused)
	underlyingErr := errors.Unwrap(err)
	if underlyingErr == nil {
		t.Error("Expected error to be wrapped via %w, but errors.Unwrap returned nil")
	}
}
