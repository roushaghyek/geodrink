export interface GeoPoint {
  lat: number;
  lon: number;
}

/**
 * Current conditions for a point. Only `tempC` is needed by Phase 1 modes;
 * the rest is carried through for Phase 2 (Where's Scrooby? clues).
 */
export interface WeatherObservation {
  tempC: number;
  feelsLikeC?: number;
  humidity?: number;
  windSpeedMs?: number;
  description?: string;
  /** Seconds east of UTC at the location (local time = UTC + offset). */
  timezoneOffsetSec?: number;
  /** Unix seconds. */
  sunrise?: number;
  sunset?: number;
  /** When the provider says the reading was taken (ms epoch). */
  observedAt: number;
  /** When we received it (ms epoch). */
  fetchedAt: number;
}

/**
 * A weather backend. `fetchMany` returns one entry per input point, in order,
 * with `null` for points it could not fetch. It may throw for a total failure.
 */
export interface WeatherProvider {
  name: string;
  /** Max points per fetchMany call (1 = provider cannot batch). */
  maxBatchSize: number;
  fetchMany: (points: GeoPoint[]) => Promise<(WeatherObservation | null)[]>;
}

export function pointKey(point: GeoPoint): string {
  return `${point.lat.toFixed(2)},${point.lon.toFixed(2)}`;
}

/** The whole-degree °C value games show and score against. */
export function gameTemperature(observation: WeatherObservation): number {
  return Math.round(observation.tempC);
}
