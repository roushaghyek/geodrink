# Weathr: notes for Claude and contributors

Weathr (weathr.ee) is a weather guessing game: players guess the current
temperature in real cities. One app, several modes, one shared engine.
Mascot: **Scrooby** the hedgehog (placeholder art for now).

## Stack

- Expo SDK 54, React Native 0.81, React 19 (React Compiler on), TypeScript strict
- Expo Router (file-based routes in `app/`); web build is static (`expo export`) on Vercel, iOS via EAS
- No accounts. Local persistence with AsyncStorage (localStorage on web)
- Cloudflare Worker + Durable Objects in `worker/`: weather proxy and online party rooms

## Commands

```bash
yarn test                          # unit tests (sucrase-node, no Jest): tests/*.test.ts
npx tsc --noEmit -p .              # type check
yarn lint                          # expo lint (app/ + components/)
npx eslint engine services worker tests utils cypress   # the rest
yarn e2e                           # Cypress against a static web export (stubs the weather proxy)
```

Run tests, type check and lint after every change. Keep commits small, one mode or concern at a time.

## Layout

```
engine/            Pure TypeScript game logic. NO React / React Native imports
                   (so the Worker and tests can import it).
  scoring.ts       degrees off (in °C), °F display helpers, share bands, Scrooby mood
  daily.ts         UTC day index -> daily city (frozen pool), streaks, share text
  hot-or-cold.ts   chain-format pair logic, prefetch targets
  party.ts         Party reducer (phases, hand-off, reveal), standings, config validation
  penalty.ts       penalty points (scaled + capped), ranking by error, ties
  cities.ts        balanced random city picks, cityKey
  deck.ts          shuffled deck without immediate repeats (forfeits)
  random.ts        seeded PRNG + hash (anything shared across devices)
  guess-input.ts   number-entry sanitising / parsing
  weather/         types, OpenWeather parser, client (cache/de-dupe/batch/retry), providers
data/              cities.ts (game pool), daily-cities.ts (FROZEN daily pool), forfeits.ts, funFacts.ts
services/          app-side singletons: weather client, audio, daily/party storage, online party
hooks/             useWeatherCities (N cities with weather), useCityQueue (prefetch queue),
                   usePalette, useGoHome
components/game/   shared UI: TemperatureGuessInput, ResultReveal, Scrooby, CityCard,
                   ScreenHeader, ModeCard, Segmented, WeatherNotice (demo badge / error+retry)
contexts/          Theme, Language, Session, TempUnit (°C default, °F toggle)
app/               routes: index (home), daily, hot-or-cold, party-setup, party, practice,
                   rules, settings, online-party (Labs), modal
worker/            party-worker.js (entry, rooms) + weather-proxy.ts (weather API proxy)
tests/             harness.ts + one file per area; run-tests.ts imports them all
```

## Modes

| Mode | Route | Engine | Notes |
|---|---|---|---|
| Weathr Daily | `app/daily.tsx` | `engine/daily.ts` | Same city for everyone per UTC day; one guess; spoiler-free share; local streak/history |
| Hotter or Colder | `app/hot-or-cold.tsx` | `engine/hot-or-cold.ts` | Endless, chain format, ties count as right; high score; prefetch queue |
| Party | `app/party-setup.tsx`, `app/party.tsx` | `engine/party.ts`, `engine/penalty.ts` | 2-12 players, hand-off screen, ranked reveal; forfeits default, drinks opt-in 18+ |
| Practice | `app/practice.tsx` | `engine/scoring.ts` | 10 random cities |
| Online party (Labs) | `app/online-party.tsx` | `worker/party-worker.js` | Hidden behind Settings > Labs. Still uses the old ±2°C rule; to become Couch mode |

**Adding a mode:** put the rules in `engine/` as pure functions (and a reducer if it has
phases), test them in `tests/`, then build the screen from `components/game/*` with
`useWeatherCities` or `useCityQueue` for data. Register the route in `app/_layout.tsx`
and add a `ModeCard` to `app/index.tsx`.

## Rules that must hold

- **Scoring is absolute degrees off, computed in °C.** Use `evaluateGuess()`: it scores
  against the temperature *as displayed* in the player's unit, so typing the shown number
  is a perfect 0. Bands and penalties are defined in °C and converted for display.
- **Games score against whole-degree °C** (`gameTemperature(observation)`), the same
  number the UI shows.
- **Never invent temperatures in gameplay.** If weather fails, skip the city (or show
  `WeatherError` with retry). The demo provider exists only for local dev and is labelled
  in the UI (`DemoWeatherBadge`).
- **Daily determinism:** `data/daily-cities.ts` is frozen. Never edit, reorder or remove
  entries; to grow the pool, append a new entry to `DAILY_POOLS` in `engine/daily.ts`
  with a future `fromDay`. `tests/daily.test.ts` pins known days and must not be
  "updated" to match a change.
- **Daily consistency caveat:** Daily scores use the live temperature at guess time.
  The Worker's 10-minute shared edge cache makes players in the same window consistent,
  but scores drift across the day. The result screen shows the UTC time of the reading.
  A league (Phase 2) should snapshot one reading per city per day server-side.
- **Drinking content:** only in Party, only after the 18+ confirmation, always with the
  drink-responsibly note. Sips, water counts, skip any time, cap of 5 per round. Never
  copy about shots, speed, chugging or heavy drinking (App Store guideline 1.4.3 /
  responsible-use). The forfeit deck must stay drink-free (a test enforces banned words).
- **No secrets in the app.** `EXPO_PUBLIC_*` variables ship to every player.

## Weather

App -> `services/weather.ts` (one `WeatherClient`: per-city 10-minute cache, in-flight
de-dupe, max 3 concurrent calls, 1 retry, batching up to 20) -> Worker `GET /weather`,
`POST /weather/batch` -> OpenWeather `/data/2.5/weather`.

- Worker: key in the `OPENWEATHER_API_KEY` secret (`cd worker && npx wrangler secret put
  OPENWEATHER_API_KEY`), 10-minute edge cache, only serves coordinates of cities in
  `data/cities.ts` / `data/daily-cities.ts`.
- App config: `EXPO_PUBLIC_WEATHR_API_URL` (falls back to
  `EXPO_PUBLIC_WEATHR_PARTY_SERVER_URL`). Dev builds without it use demo weather;
  production builds without it show "weather unavailable". See `.env.example`.
- The old OpenWeather key was hard-coded in the app and is in git history: it must be
  rotated.
- `public/sw.js` must never cache weather or cross-origin requests.

## Persistence (AsyncStorage keys)

`@weathr_daily_history`, `@weathr_hot_cold_best`, `@weathr_party_settings`,
`@weathr_online_party_enabled`, plus the older `@weathr_stats`, `@weathr_temp_unit`,
`@weathr_dark_mode`, `@weathr_session_active`, `@weathr_language`,
`@weathr_sound_effects`. Use `getJSON`/`setJSON` and `STORAGE_KEYS` in `utils/storage.ts`.

## UI conventions

- Colours via `usePalette()`; brand deep blue is `colors.brand` (#1F4D7A light).
- Mobile-first: content max width 560, 16px side padding, touch targets of 44px or more,
  `accessibilityRole` / `accessibilityLabel` on every control, `accessibilityLiveRegion`
  on results.
- Scrooby: `<Scrooby mood="happy|sweating|shivering|sad|hello|thinking" />`. It's an
  emoji placeholder; swap the inner view for real art without changing props.
- i18n: English (`en` in `utils/i18n.ts`) is the source of truth; other languages may
  omit newer keys and fall back to English.

## Known issues

- React hydration warning #418 on every statically exported web page (since before the
  engine refactor).
- `public/sw.js` serves same-origin pages cache-first, so a deploy can take a while to
  reach returning web players (bump `CACHE_NAME` on releases).
- `expo-av` is deprecated; move `services/audio.ts` to `expo-audio`.
- Online party (Labs) has its own 36-city list, the old ±2°C scoring and a mock fallback
  in the Worker; it's slated to become Couch mode on `engine/party.ts`.
- Cypress specs (`cypress/e2e/*`) were updated for the new flows but not run in CI here;
  the same flows were checked with Playwright.
