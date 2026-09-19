package partshipments

import (
	"testing"
	"time"
)

func TestCanTransition(t *testing.T) {
	allowed := [][2]string{
		{StatusSent, StatusReceived},
		{StatusSent, StatusRejected},
		{StatusSent, StatusCancelled},
		{StatusReceived, StatusInvoiced},
		{StatusInvoiced, StatusPaid},
	}
	for _, c := range allowed {
		if !canTransition(c[0], c[1]) {
			t.Errorf("%s -> %s should be allowed", c[0], c[1])
		}
	}

	// Money must move strictly forward: no skipping the invoice, no paying
	// twice, nothing leaves a terminal state.
	forbidden := [][2]string{
		{StatusSent, StatusInvoiced},
		{StatusSent, StatusPaid},
		{StatusReceived, StatusPaid},
		{StatusReceived, StatusRejected},
		{StatusInvoiced, StatusReceived},
		{StatusPaid, StatusPaid},
		{StatusPaid, StatusCancelled},
		{StatusRejected, StatusReceived},
		{StatusCancelled, StatusSent},
		{"Bogus", StatusReceived},
	}
	for _, c := range forbidden {
		if canTransition(c[0], c[1]) {
			t.Errorf("%s -> %s should be forbidden", c[0], c[1])
		}
	}
}

func TestParseSentOn(t *testing.T) {
	today := time.Now().Format("2006-01-02")
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	nextWeek := time.Now().AddDate(0, 0, 7).Format("2006-01-02")

	for _, ok := range []string{today, tomorrow, "2020-02-29", " " + today + " "} {
		if _, err := parseSentOn(ok); err != nil {
			t.Errorf("parseSentOn(%q) = %v, want nil", ok, err)
		}
	}

	// Tomorrow is tolerated (the server clock can be behind the technician's);
	// a week ahead is not.
	if _, err := parseSentOn(nextWeek); err != ErrFutureDate {
		t.Errorf("parseSentOn(next week) = %v, want ErrFutureDate", err)
	}
	for _, bad := range []string{"", "19/09/2026", "2026-13-01", "2026-02-30", "yesterday"} {
		if _, err := parseSentOn(bad); err != ErrBadDate {
			t.Errorf("parseSentOn(%q) = %v, want ErrBadDate", bad, err)
		}
	}
}
