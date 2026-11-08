import assert from 'node:assert/strict';
import { EdgeCacheLike, handleWeatherRequest } from '../worker/weather-proxy';
import { test } from './harness';

const TALLINN = { lat: 59.437, lon: 24.7536 }; // in data/cities.ts
const env = { OPENWEATHER_API_KEY: 'secret-key' };

function memoryCache(): EdgeCacheLike & { size: () => number } {
  const store = new Map<string, string>();
  return {
    match: async key => (store.has(key.url) ? new Response(store.get(key.url)) : undefined),
    put: async (key, value) => {
      store.set(key.url, await value.text());
    },
    size: () => store.size,
  };
}

function upstream() {
  const urls: string[] = [];
  const fetchImpl = async (input: string) => {
    urls.push(input);
    return new Response(JSON.stringify({ dt: 1, main: { temp: 4.2 } }), { status: 200 });
  };
  return { urls, fetchImpl };
}

test('worker proxy: ignores non-weather routes', async () => {
  const response = await handleWeatherRequest(new Request('https://w.example/rooms'), env, { fetch: upstream().fetchImpl });
  assert.equal(response, null);
});

test('worker proxy: key stays server-side and readings are edge-cached', async () => {
  const { urls, fetchImpl } = upstream();
  const cache = memoryCache();
  const url = `https://w.example/weather?lat=${TALLINN.lat}&lon=${TALLINN.lon}`;
  const first = await handleWeatherRequest(new Request(url), env, { fetch: fetchImpl, cache });
  const body = (await first!.json()) as { observation: { tempC: number } };
  assert.equal(body.observation.tempC, 4.2);
  assert.equal(JSON.stringify(body).includes('secret-key'), false);
  assert.equal(urls[0].includes('appid=secret-key'), true);
  await handleWeatherRequest(new Request(url), env, { fetch: fetchImpl, cache });
  assert.equal(urls.length, 1);
  assert.equal(cache.size(), 1);
});

test('worker proxy: only serves game cities, and reports missing config', async () => {
  const { urls, fetchImpl } = upstream();
  const unknown = await handleWeatherRequest(new Request('https://w.example/weather?lat=1&lon=1'), env, { fetch: fetchImpl });
  assert.equal(unknown!.status, 400);
  assert.equal(urls.length, 0);
  const unconfigured = await handleWeatherRequest(new Request(`https://w.example/weather?lat=${TALLINN.lat}&lon=${TALLINN.lon}`), {}, { fetch: fetchImpl });
  assert.equal(unconfigured!.status, 503);
});

test('worker proxy: batch returns one result per point, null for unknown or failed', async () => {
  const { fetchImpl } = upstream();
  const request = new Request('https://w.example/weather/batch', {
    method: 'POST',
    body: JSON.stringify({ points: [TALLINN, { lat: 0, lon: 0 }] }),
  });
  const response = await handleWeatherRequest(request, env, { fetch: fetchImpl });
  const body = (await response!.json()) as { results: ({ tempC: number } | null)[] };
  assert.equal(body.results[0]?.tempC, 4.2);
  assert.equal(body.results[1], null);
  const tooMany = new Request('https://w.example/weather/batch', {
    method: 'POST',
    body: JSON.stringify({ points: Array.from({ length: 21 }, () => TALLINN) }),
  });
  assert.equal((await handleWeatherRequest(tooMany, env, { fetch: fetchImpl }))!.status, 400);
});
