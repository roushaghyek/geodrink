import { createWeatherClient } from '../engine/weather/client';
import { createMockProvider, createProxyProvider, createUnavailableProvider } from '../engine/weather/providers';

/**
 * The app's single weather client. No API key lives in the app: live
 * readings come from the Weathr Worker (worker/weather-proxy.ts).
 *
 * Config (Expo public env vars, inlined at build time):
 *   EXPO_PUBLIC_WEATHR_API_URL       Worker base URL (falls back to
 *                                    EXPO_PUBLIC_WEATHR_PARTY_SERVER_URL, same Worker)
 *   EXPO_PUBLIC_WEATHR_DEMO_WEATHER  "1" forces labelled demo weather
 *
 * With neither set, dev builds use demo weather and production builds report
 * the weather as unavailable rather than inventing temperatures.
 */

export type WeatherSource = 'live' | 'demo' | 'unconfigured';

const apiUrl = (process.env.EXPO_PUBLIC_WEATHR_API_URL || process.env.EXPO_PUBLIC_WEATHR_PARTY_SERVER_URL || '').trim();
const forceDemo = process.env.EXPO_PUBLIC_WEATHR_DEMO_WEATHER === '1';
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

export const weatherSource: WeatherSource = forceDemo ? 'demo' : apiUrl ? 'live' : isDev ? 'demo' : 'unconfigured';

const provider =
  weatherSource === 'live'
    ? createProxyProvider(apiUrl)
    : weatherSource === 'demo'
      ? createMockProvider()
      : createUnavailableProvider();

export const weatherClient = createWeatherClient({ provider });
