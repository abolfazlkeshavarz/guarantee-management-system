package warrantycode

import "testing"

// The batch boundaries are the whole point of the seasonal format, so they are
// pinned here: an off-by-one moves a device into the wrong season and, with it,
// its warranty expiry.
func TestParseSeasonalCode_BatchBoundaries(t *testing.T) {
	cases := []struct {
		name      string
		code      string
		wantMonth int
		wantOK    bool
	}{
		// 1403, plain prefix: spring 1-700, summer 701-1370.
		{"1403 FZ first serial", "1403FZ2400100001", 3, true},
		{"1403 FZ last of spring", "1403FZ2400100700", 3, true},
		{"1403 FZ first of summer", "1403FZ2400100701", 6, true},
		{"1403 FZ last of summer", "1403FZ2400101370", 6, true},
		{"1403 FZ past last batch", "1403FZ2400101371", 0, false},
		{"1403 FZ serial zero", "1403FZ2400100000", 0, false},

		// 1403, D prefix: autumn 1-1800, winter 1801-2958.
		{"1403 FZD first of autumn", "1403FZD2400100001", 9, true},
		{"1403 FZD last of autumn", "1403FZD2400101800", 9, true},
		{"1403 FZD first of winter", "1403FZD2400101801", 12, true},
		{"1403 FZD last of winter", "1403FZD2400102958", 12, true},
		{"1403 FZD past last batch", "1403FZD2400102959", 0, false},

		// 1404: one sequence for both prefixes, final batch open-ended.
		{"1404 spring start", "1404FZ2400100001", 3, true},
		{"1404 spring end", "1404FZ2400101200", 3, true},
		{"1404 summer start", "1404FZ2400101201", 6, true},
		{"1404 summer end", "1404FZ2400101900", 6, true},
		{"1404 autumn start", "1404FZ2400101901", 9, true},
		{"1404 autumn end", "1404FZ2400103400", 9, true},
		{"1404 winter start", "1404FZ2400103401", 12, true},
		{"1404 winter open ended", "1404FZ2400109999", 12, true},
		{"1404 D prefix shares the table", "1404FZD2400101201", 6, true},

		// Years without a recorded batch table cannot be parsed at all.
		{"1400 has no batches", "1400FZ2400100001", 0, false},
		{"1402 has no batches", "1402FZ2400100001", 0, false},
		{"1405 belongs to the encoded format", "1405FZ2400100001", 0, false},

		// Shape errors.
		{"five digit serial", "1404FZ24001012345", 0, false},
		{"three digit serial", "1404FZ240010123", 0, false},
		{"wrong model segment", "1404FZ2400110001", 0, false},
		{"empty", "", 0, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := ParseSeasonalCode(tc.code, "FZD")
			if !tc.wantOK {
				if got != nil {
					t.Fatalf("expected %q to be rejected, got month %d", tc.code, got.Month)
				}
				return
			}
			if got == nil {
				t.Fatalf("expected %q to parse", tc.code)
			}
			if got.Month != tc.wantMonth {
				t.Errorf("month = %d, want %d", got.Month, tc.wantMonth)
			}
			if !got.SeasonOnly {
				t.Error("SeasonOnly should be true for a seasonal code")
			}
		})
	}
}

// A product registered under either spelling of the prefix must recognise both
// spellings of its own codes.
func TestSeasonalPrefixVariants(t *testing.T) {
	for _, prefix := range []string{"FZ", "FZD"} {
		for _, code := range []string{"1404FZ2400101201", "1404FZD2400101201"} {
			if got := ParseSeasonalCode(code, prefix); got == nil {
				t.Errorf("prefix %q failed to parse %q", prefix, code)
			}
		}
	}
}

// The seasonal and encoded formats must not accept each other's codes.
func TestSeasonalAndEncodedDoNotOverlap(t *testing.T) {
	encoded := "1405FZD0912345"
	if ParseSeasonalCode(encoded, "FZD") != nil {
		t.Error("seasonal parser accepted an encoded code")
	}
	seasonal := "1404FZD2400101201"
	if ParseCode(seasonal, "FZD") != nil {
		t.Error("encoded parser accepted a seasonal code")
	}
}

// The generated pattern is what Postgres uses to route a code to a product, so
// it must agree with the parser about what belongs to this product.
func TestSeasonalPatternMatchesParser(t *testing.T) {
	pattern := SeasonalPattern("FZD")
	want := `^[0-9]{4}FZD?240010[0-9]{4}$`
	if pattern != want {
		t.Fatalf("pattern = %q, want %q", pattern, want)
	}
}

func TestValidateSeasonalCode_ReportsSeasonNotMonth(t *testing.T) {
	res := ValidateSeasonalCode("1404FZ2400101201", "FZD")
	if !res.Valid {
		t.Fatalf("expected valid, got %q", res.Message)
	}
	if !res.SeasonOnly {
		t.Error("SeasonOnly should be set")
	}
	if res.SeasonName != "تابستان" {
		t.Errorf("season = %q, want تابستان", res.SeasonName)
	}
}

func TestValidateSeasonalCode_ExplainsUnknownYear(t *testing.T) {
	res := ValidateSeasonalCode("1401FZ2400100001", "FZD")
	if res.Valid {
		t.Fatal("year 1401 has no batch table and must not validate")
	}
	if res.Message == "" || res.MessageType != "error" {
		t.Errorf("expected an error message, got %+v", res)
	}
}

func TestValidateSeasonalCode_ExplainsOutOfRangeSerial(t *testing.T) {
	res := ValidateSeasonalCode("1403FZ2400109999", "FZD")
	if res.Valid {
		t.Fatal("serial beyond the last 1403 batch must not validate")
	}
	if res.MessageType != "error" {
		t.Errorf("message type = %q, want error", res.MessageType)
	}
}
