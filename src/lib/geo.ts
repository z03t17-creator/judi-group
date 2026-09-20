const EARTH_KM = 6371;

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type DistancedStore<T extends { latitude: number | null; longitude: number | null }> = T & {
  distanceKm: number | null;
};

export function sortStoresByDistance<T extends { latitude: number | null; longitude: number | null }>(
  stores: T[],
  origin: GeoPoint | null,
): DistancedStore<T>[] {
  const withDistance = stores.map((store) => {
    const hasGps =
      store.latitude != null &&
      store.longitude != null &&
      Number.isFinite(store.latitude) &&
      Number.isFinite(store.longitude);
    return {
      ...store,
      distanceKm:
        origin && hasGps
          ? haversineKm(origin.latitude, origin.longitude, store.latitude!, store.longitude!)
          : null,
    };
  });

  return withDistance.sort((a, b) => {
    if (origin) {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    }
    return 0;
  });
}
