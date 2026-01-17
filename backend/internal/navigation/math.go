package navigation

import "math"

// Earth radius in Kilometers
const R = 6371.0

func toRadians(deg float64) float64 {
	return deg * math.Pi / 180
}

func toDegrees(rad float64) float64 {
	return rad * 180 / math.Pi
}

// CalculateNextPosition determines new lat/lon based on speed (knots), heading, and time
func CalculateNextPosition(lat, lon, speedKnots, heading float64, durationSeconds float64) (float64, float64) {
	// 1. Convert Speed (Knots) to Distance (Kilometers) per second
	// 1 Knot = 1.852 km/h
	speedKmph := speedKnots * 1.852
	distanceKm := (speedKmph / 3600) * durationSeconds // Distance travelled in this tick

	// 2. Convert to Radians
	lat1 := toRadians(lat)
	lon1 := toRadians(lon)
	brng := toRadians(heading) // Bearing (Heading)

	// 3. The Formula (Haversine / Spherical Trigonometry)
	// Don't worry about the math, this is standard navigation physics
	lat2 := math.Asin(math.Sin(lat1)*math.Cos(distanceKm/R) + math.Cos(lat1)*math.Sin(distanceKm/R)*math.Cos(brng))
	lon2 := lon1 + math.Atan2(math.Sin(brng)*math.Sin(distanceKm/R)*math.Cos(lat1), math.Cos(distanceKm/R)-math.Sin(lat1)*math.Sin(lat2))

	return toDegrees(lat2), toDegrees(lon2)
}