import { CITIES } from '../data/cities';
import { DAILY_CITIES_V1 } from '../data/daily-cities';
import { parseOpenWeatherCurrent } from '../engine/weather/openweather';
import { GeoPoint, pointKey, WeatherObservation } from '../engine/weather/types';

/**
 * Weather proxy for the app. The OpenWeather key lives only here, as the
 * Worker secret OPENWEATHER_API_KEY (`wrangler secret put OPENWEATHER_API_KEY`).
 *
 *   GET  /weather?lat=..&lon=..                -> { observation }
 *   POST /weather/batch { points: [{lat,lon}] } -> { results: (observation|null)[] }
 *
 * Readings are cached at the edge for EDGE_TTL_SECONDS, shared by every
 * player, which keeps Daily scores consistent within a window and keeps us
 * well inside the OpenWeather rate limit. Only coordinates of cities in the
 * game are served, so the proxy can't be used as a free weather API.
 */

export const EDGE_TTL_SECONDS = 600;
export const MAX_BATCH = 20;

const ALLOWED_POINTS = new Set([...CITIES, ...DAILY_CITIES_V1].map(pointKey));

export interface WeatherProxyEnv {
  OPENWEATHER_API_KEY?: string;
}

export interface EdgeCacheLike {
  match: (key: Request) => Promise<Response | undefined>;
  put: (key: Request, value: Response) => Promise<void>;
}

export interface WeatherProxyDeps {
  fetch: (input: string) => Promise<Response>;
  cache?: EdgeCacheLike;
  waitUntil?: (promise: Promise<unknown>) => void;
  now?: () => number;
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      ...extraHeaders,
    },
  });
}

export function parsePoint(lat: unknown, lon: unknown): GeoPoint | null {
  const point = { lat: Number(lat), lon: Number(lon) };
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return null;
  if (Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) return null;
  return point;
}

export function isAllowedPoint(point: GeoPoint): boolean {
  return ALLOWED_POINTS.has(pointKey(point));
}

async function fetchObservation(point: GeoPoint, env: WeatherProxyEnv, deps: WeatherProxyDeps): Promise<WeatherObservation | null> {
  const cacheKey = new Request(`https://weathr-weather-cache.internal/v1/${pointKey(point)}`);
  if (deps.cache) {
    const hit = await deps.cache.match(cacheKey);
    if (hit) return (await hit.json()) as WeatherObservation;
  }

  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('lat', String(point.lat));
  url.searchParams.set('lon', String(point.lon));
  url.searchParams.set('units', 'metric');
  url.searchParams.set('appid', env.OPENWEATHER_API_KEY ?? '');

  try {
    const response = await deps.fetch(url.toString());
    if (!response.ok) return null;
    const observation = parseOpenWeatherCurrent(await response.json(), (deps.now ?? Date.now)());
    if (!observation) return null;
    if (deps.cache) {
      const stored = deps.cache.put(
        cacheKey,
        new Response(JSON.stringify(observation), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${EDGE_TTL_SECONDS}` },
        })
      );
      if (deps.waitUntil) deps.waitUntil(stored);
      else await stored;
    }
    return observation;
  } catch {
    return null;
  }
}

/** Returns a Response for /weather routes, or null so the caller can route elsewhere. */
export async function handleWeatherRequest(request: Request, env: WeatherProxyEnv, deps: WeatherProxyDeps): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== '/weather' && url.pathname !== '/weather/batch') return null;

  if (!env.OPENWEATHER_API_KEY) {
    return json({ message: 'Weather service is not configured.' }, 503);
  }

  if (request.method === 'GET' && url.pathname === '/weather') {
    const point = parsePoint(url.searchParams.get('lat'), url.searchParams.get('lon'));
    if (!point || !isAllowedPoint(point)) return json({ message: 'Unknown city.' }, 400);
    const observation = await fetchObservation(point, env, deps);
    if (!observation) return json({ observation: null, message: 'Weather unavailable.' }, 502);
    return json({ observation }, 200, { 'Cache-Control': 'public, max-age=60' });
  }

  if (request.method === 'POST' && url.pathname === '/weather/batch') {
    const body = (await request.json().catch(() => null)) as { points?: unknown } | null;
    if (!body || !Array.isArray(body.points) || body.points.length === 0 || body.points.length > MAX_BATCH) {
      return json({ message: `Send 1-${MAX_BATCH} points.` }, 400);
    }
    const results = await Promise.all(
      body.points.map(raw => {
        const candidate = raw as { lat?: unknown; lon?: unknown } | null;
        const point = parsePoint(candidate?.lat, candidate?.lon);
        return point && isAllowedPoint(point) ? fetchObservation(point, env, deps) : Promise.resolve(null);
      })
    );
    return json({ results });
  }

  return json({ message: 'Method not allowed.' }, 405);
}
