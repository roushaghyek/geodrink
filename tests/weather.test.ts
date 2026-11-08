import assert from 'node:assert/strict';
import { createWeatherClient, WeatherUnavailableError, withWeather } from '../engine/weather/client';
import { parseOpenWeatherCurrent } from '../engine/weather/openweather';
import { createMockProvider, createProxyProvider } from '../engine/weather/providers';
import { GeoPoint, WeatherObservation, WeatherProvider } from '../engine/weather/types';
import { test } from './harness';

function obs(tempC: number): WeatherObservation {
  return { tempC, observedAt: 0, fetchedAt: 0 };
}

function fakeProvider(options: { maxBatchSize?: number; fail?: (p: GeoPoint, call: number) => boolean } = {}) {
  const calls: GeoPoint[][] = [];
  const provider: WeatherProvider = {
    name: 'fake',
    maxBatchSize: options.maxBatchSize ?? 20,
    async fetchMany(points) {
      calls.push(points);
      return points.map(p => (options.fail?.(p, calls.length) ? null : obs(p.lat)));
    },
  };
  return { provider, calls };
}

const noSleep = async () => {};

test('weather client: caches per city within the TTL, refetches after', async () => {
  let clock = 1_000;
  const { provider, calls } = fakeProvider();
  const client = createWeatherClient({ provider, ttlMs: 600_000, now: () => clock, sleep: noSleep });
  const point = { lat: 10, lon: 20 };
  assert.equal((await client.get(point)).tempC, 10);
  assert.equal((await client.get(point)).tempC, 10);
  assert.equal(calls.length, 1);
  clock += 600_001;
  assert.equal(client.peek(point), undefined);
  await client.get(point);
  assert.equal(calls.length, 2);
});

test('weather client: concurrent requests for the same city share one fetch', async () => {
  const { provider, calls } = fakeProvider();
  const client = createWeatherClient({ provider, sleep: noSleep });
  const point = { lat: 5, lon: 5 };
  await Promise.all([client.get(point), client.get(point), client.getMany([point, point])]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].length, 1);
});

test('weather client: batches by provider limit', async () => {
  const { provider, calls } = fakeProvider({ maxBatchSize: 3 });
  const client = createWeatherClient({ provider, sleep: noSleep, maxConcurrent: 1 });
  const points = Array.from({ length: 7 }, (_, i) => ({ lat: i, lon: i }));
  const results = await client.getMany(points);
  assert.deepEqual(results.map(r => r?.tempC), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(calls.map(c => c.length), [3, 3, 1]);
});

test('weather client: retries failed cities once, then reports them as null', async () => {
  // City at lat 1 fails on the first call only; lat 2 always fails.
  const { provider, calls } = fakeProvider({ fail: (p, call) => p.lat === 2 || (p.lat === 1 && call === 1) });
  const client = createWeatherClient({ provider, retries: 1, sleep: noSleep });
  const results = await client.getMany([{ lat: 1, lon: 0 }, { lat: 2, lon: 0 }, { lat: 3, lon: 0 }]);
  assert.deepEqual(results.map(r => r?.tempC ?? null), [1, null, 3]);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].map(p => p.lat), [1, 2]);
  await assert.rejects(client.get({ lat: 2, lon: 0 }), WeatherUnavailableError);
});

test('weather client: a throwing provider never crashes getMany', async () => {
  const provider: WeatherProvider = { name: 'down', maxBatchSize: 5, fetchMany: async () => { throw new Error('offline'); } };
  const client = createWeatherClient({ provider, sleep: noSleep });
  assert.deepEqual(await client.getMany([{ lat: 1, lon: 1 }]), [null]);
});

test('weather client: withWeather skips cities that failed', async () => {
  const { provider } = fakeProvider({ fail: p => p.lat === 2 });
  const client = createWeatherClient({ provider, retries: 0, sleep: noSleep });
  const cities = [1, 2, 3].map(lat => ({ city: `C${lat}`, country: 'X', lat, lon: 0, continent: 'Y' }));
  const { ok, failed } = await withWeather(client, cities);
  assert.deepEqual(ok.map(entry => entry.city.city), ['C1', 'C3']);
  assert.deepEqual(failed.map(city => city.city), ['C2']);
});

test('weather proxy provider: single GET and batched POST', async () => {
  const requests: { url: string; body?: string }[] = [];
  const fetchImpl = async (url: string, init?: { body?: string }) => {
    requests.push({ url, body: init?.body });
    const payload = url.endsWith('/batch') ? { results: [obs(1), null] } : { observation: obs(7) };
    return { ok: true, status: 200, json: async () => payload };
  };
  const provider = createProxyProvider('https://api.example.com/', fetchImpl);
  assert.equal((await provider.fetchMany([{ lat: 1.5, lon: 2 }]))[0]?.tempC, 7);
  assert.equal(requests[0].url, 'https://api.example.com/weather?lat=1.5&lon=2');
  const batch = await provider.fetchMany([{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }]);
  assert.deepEqual(batch.map(r => r?.tempC ?? null), [1, null]);
  assert.equal(requests[1].url, 'https://api.example.com/weather/batch');
  assert.deepEqual(JSON.parse(requests[1].body!), { points: [{ lat: 1, lon: 1 }, { lat: 2, lon: 2 }] });
});

test('weather: OpenWeather payload parsing keeps Phase 2 clue fields', () => {
  const parsed = parseOpenWeatherCurrent(
    { dt: 100, timezone: 7200, main: { temp: 21.46, feels_like: 20, humidity: 40 }, wind: { speed: 3 }, weather: [{ description: 'clear sky' }], sys: { sunrise: 1, sunset: 2 } },
    5
  );
  assert.deepEqual(parsed, {
    tempC: 21.5, feelsLikeC: 20, humidity: 40, windSpeedMs: 3, description: 'clear sky',
    timezoneOffsetSec: 7200, sunrise: 1, sunset: 2, observedAt: 100_000, fetchedAt: 5,
  });
  assert.equal(parseOpenWeatherCurrent({ main: {} }, 0), null);
  assert.equal(parseOpenWeatherCurrent(null, 0), null);
});

test('weather: demo provider is deterministic within the hour', async () => {
  const provider = createMockProvider(() => 3_600_000 * 5 + 10);
  const [a] = await provider.fetchMany([{ lat: 59.4, lon: 24.7 }]);
  const [b] = await provider.fetchMany([{ lat: 59.4, lon: 24.7 }]);
  assert.equal(a?.tempC, b?.tempC);
});
