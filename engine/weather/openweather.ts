import type { WeatherObservation } from './types';

/**
 * Parse an OpenWeather `/data/2.5/weather?units=metric` response.
 * Shared by the Cloudflare Worker proxy and tests. Returns null when the
 * payload has no usable temperature.
 */
export function parseOpenWeatherCurrent(data: unknown, fetchedAt: number): WeatherObservation | null {
  if (!data || typeof data !== 'object') return null;
  const body = data as {
    dt?: number;
    timezone?: number;
    main?: { temp?: number; feels_like?: number; humidity?: number };
    wind?: { speed?: number };
    weather?: { description?: string }[];
    sys?: { sunrise?: number; sunset?: number };
  };
  const temp = Number(body.main?.temp);
  if (!Number.isFinite(temp)) return null;

  const optionalNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

  return {
    tempC: Math.round(temp * 10) / 10,
    feelsLikeC: optionalNumber(body.main?.feels_like),
    humidity: optionalNumber(body.main?.humidity),
    windSpeedMs: optionalNumber(body.wind?.speed),
    description: typeof body.weather?.[0]?.description === 'string' ? body.weather[0].description : undefined,
    timezoneOffsetSec: optionalNumber(body.timezone),
    sunrise: optionalNumber(body.sys?.sunrise),
    sunset: optionalNumber(body.sys?.sunset),
    observedAt: typeof body.dt === 'number' ? body.dt * 1000 : fetchedAt,
    fetchedAt,
  };
}
