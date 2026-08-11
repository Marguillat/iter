package utils

import (
	"testing"
)

func TestCheckIsGTIN(t *testing.T) {
	var (
		// Wrong GTINs
		tooLongGTIN  string = "123456789000000"
		tooShortGTIN string = "1234567"
		lettersGTIN  string = "a12345678"
		symbolGTIN   string = "=12345678"
		// Valid GTINs
		validShortGTIN string = "12345678"
		validLongGTIN  string = "12345678900000"
	)

	// Fail
	if v := CheckIsGTIN(&tooLongGTIN); v {
		t.Error("Expected fail on LONG GTIN got pass")
	}
	if v := CheckIsGTIN(&tooShortGTIN); v {
		t.Error("Expected fail on SHORT GTIN got pass")
	}
	if v := CheckIsGTIN(&lettersGTIN); v {
		t.Error("Expected fail on LETTERS GTIN got pass")
	}
	if v := CheckIsGTIN(&symbolGTIN); v {
		t.Error("Expected fail on SYMBOL GTIN got pass")
	}

	// win
	if v := CheckIsGTIN(&validLongGTIN); false == v {
		t.Error("Expected pass on GTIN 14 got fail")
	}
	if v := CheckIsGTIN(&validShortGTIN); false == v {
		t.Error("Expected pass on GTIN 8 got fail")
	}

}
