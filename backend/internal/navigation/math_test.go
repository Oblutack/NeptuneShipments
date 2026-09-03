package navigation

import (
	"math"
	"testing"
)

func almostEqual(a, b, tol float64) bool { return math.Abs(a-b) <= tol }

func TestCalculateNextPosition_ZeroSpeedStaysPut(t *testing.T) {
	lat, lon := CalculateNextPosition(10, 20, 0, 90, 60)
	if !almostEqual(lat, 10, 1e-9) || !almostEqual(lon, 20, 1e-9) {
		t.Errorf("got (%v, %v), want unchanged (10, 20) at zero speed", lat, lon)
	}
}

func TestCalculateNextPosition_ZeroDurationStaysPut(t *testing.T) {
	lat, lon := CalculateNextPosition(10, 20, 15, 90, 0)
	if !almostEqual(lat, 10, 1e-9) || !almostEqual(lon, 20, 1e-9) {
		t.Errorf("got (%v, %v), want unchanged (10, 20) at zero duration", lat, lon)
	}
}

func TestCalculateNextPosition_DueNorthIncreasesLatitude(t *testing.T) {
	lat, lon := CalculateNextPosition(0, 0, 20, 0, 3600) // heading 0 = due north, 1 hour at 20kn
	if lat <= 0 {
		t.Errorf("heading due north should increase latitude, got lat=%v", lat)
	}
	if !almostEqual(lon, 0, 1e-6) {
		t.Errorf("heading due north should not change longitude, got lon=%v", lon)
	}
}

func TestCalculateNextPosition_DueEastIncreasesLongitude(t *testing.T) {
	lat, lon := CalculateNextPosition(0, 0, 20, 90, 3600) // heading 90 = due east
	if !almostEqual(lat, 0, 1e-6) {
		t.Errorf("heading due east should not change latitude, got lat=%v", lat)
	}
	if lon <= 0 {
		t.Errorf("heading due east should increase longitude, got lon=%v", lon)
	}
}

func TestCalculateNextPosition_KnownDistance(t *testing.T) {
	// 1 knot = 1.852 km/h, so 10 knots for 3600s (1hr) = 18.52km travelled.
	// Due north from the equator, that's 18.52/R radians of latitude.
	_, _ = CalculateNextPosition(0, 0, 10, 0, 3600) // sanity: shouldn't panic/NaN
	lat, _ := CalculateNextPosition(0, 0, 10, 0, 3600)
	expectedLat := toDegrees(18.52 / R)
	if !almostEqual(lat, expectedLat, 1e-6) {
		t.Errorf("lat = %v, want ~%v (18.52km due north from equator)", lat, expectedLat)
	}
}
