package repairs

import "testing"

// A part from the technician's own stock has no delivery to verify, so these
// cases must be settled before the database is touched (the service has none).
func TestRequireDeliveredPartsOwnStock(t *testing.T) {
	s := &RepairService{}
	link := uint(7)

	if err := s.requireDeliveredParts(1, []RepairComponentItemInput{
		{ComponentID: 3, FromOwnStock: true},
	}, nil); err != nil {
		t.Fatalf("own-stock part should be accepted without a request: %v", err)
	}

	if err := s.requireDeliveredParts(1, []RepairComponentItemInput{
		{ComponentID: 3, FromOwnStock: true, ComponentRequestItemID: &link},
	}, nil); err == nil {
		t.Fatal("own stock plus a request link is contradictory and must be rejected")
	}

	if err := s.requireDeliveredParts(1, []RepairComponentItemInput{
		{ComponentID: 3},
	}, nil); err == nil {
		t.Fatal("a part with neither a request link nor the own-stock flag must be rejected")
	}
}
