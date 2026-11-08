import type { City } from '../../data/cities';
import { GeoPoint, pointKey, WeatherObservation, WeatherProvider } from './types';

export class WeatherUnavailableError extends Error {
  constructor(message = 'Live weather is unavailable right now.') {
    super(message);
    this.name = 'WeatherUnavailableError';
  }
}

export interface WeatherClientOptions {
  provider: WeatherProvider;
  /** How long a reading is reused for the same city. Default 10 minutes. */
  ttlMs?: number;
  /** Max provider calls in flight at once. Default 3. */
  maxConcurrent?: number;
  /** Extra attempts for points that failed. Default 1. */
  retries?: number;
  retryDelayMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface WeatherClient {
  /** One point. Throws WeatherUnavailableError if it can't be fetched. */
  get: (point: GeoPoint) => Promise<WeatherObservation>;
  /** Many points, batched. Never throws: failed points come back as null. */
  getMany: (points: GeoPoint[]) => Promise<(WeatherObservation | null)[]>;
  /** A fresh cached reading, if any. Never fetches. */
  peek: (point: GeoPoint) => WeatherObservation | undefined;
  clear: () => void;
  readonly providerName: string;
}

export const DEFAULT_WEATHER_TTL_MS = 10 * 60 * 1000;

const defaultSleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export function createWeatherClient(options: WeatherClientOptions): WeatherClient {
  const {
    provider,
    ttlMs = DEFAULT_WEATHER_TTL_MS,
    maxConcurrent = 3,
    retries = 1,
    retryDelayMs = 400,
    now = Date.now,
    sleep = defaultSleep,
  } = options;

  const cache = new Map<string, { observation: WeatherObservation; expiresAt: number }>();
  const inflight = new Map<string, Promise<WeatherObservation | null>>();

  // Simple semaphore so prefetching never floods the provider.
  let active = 0;
  const waiting: (() => void)[] = [];
  async function withSlot<T>(task: () => Promise<T>): Promise<T> {
    if (active >= Math.max(1, maxConcurrent)) {
      await new Promise<void>(resolve => waiting.push(resolve));
    }
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  }

  function peek(point: GeoPoint): WeatherObservation | undefined {
    const entry = cache.get(pointKey(point));
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      cache.delete(pointKey(point));
      return undefined;
    }
    return entry.observation;
  }

  async function fetchChunk(points: GeoPoint[]): Promise<(WeatherObservation | null)[]> {
    let results: (WeatherObservation | null)[] = points.map(() => null);
    let pending = points.map((_, index) => index);

    for (let attempt = 0; attempt <= retries && pending.length > 0; attempt += 1) {
      if (attempt > 0) await sleep(retryDelayMs * attempt);
      const batch = pending.map(index => points[index]);
      try {
        const fetched = await withSlot(() => provider.fetchMany(batch));
        pending.forEach((index, i) => {
          results[index] = fetched[i] ?? null;
        });
      } catch {
        // Whole call failed; every pending point is retried.
      }
      pending = pending.filter(index => results[index] === null);
    }

    results = results.map(result => (result && Number.isFinite(result.tempC) ? result : null));
    results.forEach((observation, index) => {
      if (observation) cache.set(pointKey(points[index]), { observation, expiresAt: now() + ttlMs });
    });
    return results;
  }

  async function getMany(points: GeoPoint[]): Promise<(WeatherObservation | null)[]> {
    const output = new Array<Promise<WeatherObservation | null>>(points.length);
    const toFetch: GeoPoint[] = [];
    const toFetchKeys: string[] = [];
    const resolvers = new Map<string, (value: WeatherObservation | null) => void>();

    points.forEach((point, index) => {
      const key = pointKey(point);
      const cached = peek(point);
      if (cached) {
        output[index] = Promise.resolve(cached);
        return;
      }
      let promise = inflight.get(key);
      if (!promise) {
        promise = new Promise<WeatherObservation | null>(resolve => resolvers.set(key, resolve));
        inflight.set(key, promise);
        toFetch.push(point);
        toFetchKeys.push(key);
      }
      output[index] = promise;
    });

    const size = Math.max(1, provider.maxBatchSize);
    const chunks: number[][] = [];
    for (let i = 0; i < toFetch.length; i += size) {
      chunks.push(Array.from({ length: Math.min(size, toFetch.length - i) }, (_, j) => i + j));
    }

    await Promise.all(
      chunks.map(async chunk => {
        const results = await fetchChunk(chunk.map(i => toFetch[i]));
        chunk.forEach((i, j) => {
          const key = toFetchKeys[i];
          inflight.delete(key);
          resolvers.get(key)?.(results[j]);
        });
      })
    );

    return Promise.all(output);
  }

  async function get(point: GeoPoint): Promise<WeatherObservation> {
    const [observation] = await getMany([point]);
    if (!observation) throw new WeatherUnavailableError();
    return observation;
  }

  return {
    get,
    getMany,
    peek,
    clear: () => cache.clear(),
    providerName: provider.name,
  };
}

export interface CityWeather<C extends City = City> {
  city: C;
  weather: WeatherObservation;
}

/**
 * Fetch weather for a list of cities and drop any that failed ("skip city").
 * Callers top up from the pool if they need an exact count.
 */
export async function withWeather<C extends City>(client: WeatherClient, cities: C[]): Promise<{ ok: CityWeather<C>[]; failed: C[] }> {
  const results = await client.getMany(cities);
  const ok: CityWeather<C>[] = [];
  const failed: C[] = [];
  results.forEach((weather, index) => {
    if (weather) ok.push({ city: cities[index], weather });
    else failed.push(cities[index]);
  });
  return { ok, failed };
}
