import { hashString } from '../random';
import { GeoPoint, WeatherObservation, WeatherProvider } from './types';

type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export const PROXY_MAX_BATCH = 20;

/**
 * Talks to the Weathr Cloudflare Worker (`worker/weather-proxy.ts`), which
 * holds the OpenWeather key server-side and caches readings at the edge.
 *   GET  {base}/weather?lat=..&lon=..       -> { observation }
 *   POST {base}/weather/batch {points:[..]} -> { results: (observation|null)[] }
 */
export function createProxyProvider(baseUrl: string, fetchImpl: FetchLike = fetch as unknown as FetchLike): WeatherProvider {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    name: 'proxy',
    maxBatchSize: PROXY_MAX_BATCH,
    async fetchMany(points: GeoPoint[]) {
      if (points.length === 1) {
        const { lat, lon } = points[0];
        const response = await fetchImpl(`${base}/weather?lat=${lat}&lon=${lon}`);
        if (!response.ok) return [null];
        const body = (await response.json()) as { observation?: WeatherObservation | null };
        return [body?.observation ?? null];
      }
      const response = await fetchImpl(`${base}/weather/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: points.map(({ lat, lon }) => ({ lat, lon })) }),
      });
      if (!response.ok) throw new Error(`Weather batch failed (${response.status})`);
      const body = (await response.json()) as { results?: (WeatherObservation | null)[] };
      return points.map((_, index) => body?.results?.[index] ?? null);
    },
  };
}

/**
 * Deterministic fake weather for local development and tests only. Clearly
 * labelled in the UI; never used when a real weather URL is configured.
 */
export function createMockProvider(now: () => number = Date.now): WeatherProvider {
  return {
    name: 'demo',
    maxBatchSize: 50,
    async fetchMany(points: GeoPoint[]) {
      const time = now();
      const hour = Math.floor(time / 3_600_000);
      return points.map(({ lat, lon }) => {
        const base = 30 - Math.abs(lat) * 0.6;
        const jitter = (hashString(`${lat.toFixed(2)},${lon.toFixed(2)}:${hour}`) % 1000) / 100 - 5;
        return { tempC: Math.round((base + jitter) * 10) / 10, observedAt: time, fetchedAt: time };
      });
    },
  };
}

/** Used when no weather backend is configured in a production build. */
export function createUnavailableProvider(): WeatherProvider {
  return {
    name: 'unconfigured',
    maxBatchSize: 50,
    async fetchMany() {
      throw new Error('Weather service is not configured. Set EXPO_PUBLIC_WEATHR_API_URL.');
    },
  };
}
