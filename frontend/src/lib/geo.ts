const EARTH_RADIUS_KM = 6371;

// How close a real AIS vessel has to be to a port to count as "nearby".
// Larger than the simulated fleet's 10km docked-check radius on purpose -
// this covers a port's approach/anchorage area, not just the berths
// themselves, and real global AIS density is far sparser than the
// simulated fleet.
export const AIS_PORT_PROXIMITY_KM = 50;

// Great-circle distance between two lat/lon points, in kilometers.
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
