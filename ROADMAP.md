# Weathr roadmap

Phase 1 (shipped): Weathr Daily, Hotter or Colder, Party, plus Practice, all on the shared
engine in `engine/` (see CLAUDE.md).

Phase 2 is **design only**. Each item below says what it reuses, what it needs that
doesn't exist yet, and the decisions to make before building. Items marked
**needs approval** add a dependency, a paid API or new backend storage.

---

## Mates League

Private friend groups with daily scores and a weekly winner.

- **Reuses:** `DailyResult` and `dailyStreak` (`engine/daily.ts`), the `offC` score, the
  existing Worker.
- **Needs (needs approval):** backend storage for groups and results (Cloudflare D1 or a
  Durable Object per league), a lightweight identity (anonymous device ID + nickname;
  accounts later), invite codes.
- **Fairness:** today each player is scored against the live temperature when they
  guess. For a league the Worker should snapshot one reading per daily city per UTC day
  (first fetch wins, stored with the league data) and score everyone against it, or the
  Daily should switch to that snapshot for everyone. The engine already separates
  `guessC` from `actualC`, so this is a data-source change, not a scoring change.
- **Weekly winner:** a pure `weeklyStandings(results, weekStartDay)` in `engine/league.ts`
  (lowest summed `offC`; missed days count as a fixed penalty, e.g. 10°C). Week boundary
  = Monday 00:00 UTC, the same reference timezone as the Daily.
- **Open:** missed-day rule, group size limit, moderation of nicknames.

## Where's Scrooby?

Live clues (temperature, wind, local time, sunrise) revealed one at a time; guess the
city on a map; fewer clues = more points.

- **Reuses:** `WeatherObservation` already carries `windSpeedMs`, `timezoneOffsetSec`,
  `sunrise`, `sunset` and `description` from the proxy. Daily seeding
  (`engine/random.ts`) can give a shared "Scrooby of the day".
- **Engine:** `engine/clues.ts` (ordered clue list from an observation, formatted
  spoiler-free) and `engine/geo.ts` (haversine distance). Score =
  `maxPoints × clueMultiplier(cluesUsed) × distanceFactor(km)`.
- **Needs (needs approval):** a map, `react-native-maps` on native and a web map
  (e.g. MapLibre) with a free tile source. The rest is Phase 1 components.
- **Open:** pin-drop vs pick from a list on small screens; whether local time leaks the
  answer too easily (round to the hour).

## Tomorrow's Call

Predict tomorrow's maximum in your own city; it resolves the next day. **Points only:
never money, prizes or anything that resembles wagering** (no "bet", "odds", "stake",
"wager" in copy).

- **Reuses:** `evaluateGuess` / `degreesOff`, local history pattern from the Daily, the
  Worker proxy.
- **Needs (needs approval):** a forecast endpoint (`forecastMax(point, date)` on the
  `WeatherProvider` interface) and an observed daily max to resolve against.
  OpenWeather's daily aggregates may need a paid plan; alternatives are the Worker
  sampling the city through the day, or a different provider.
- **Own city:** pick from the city list (no new permission), or optionally
  `expo-location` (**needs approval** + a permission prompt).
- **Resolution:** at the city's local midnight, so it needs `timezoneOffsetSec`
  (already in observations).

## iMessage game + Scrooby sticker pack

- **Stickers:** an iOS Sticker Pack extension needs final Scrooby artwork (each mood in
  `components/game/Scrooby.tsx` maps to one sticker). Added as an Xcode target via an
  Expo config plugin (prebuild).
- **iMessage game:** a Messages extension (Swift) where the simplest version is the Daily
  share card with a deep link (`weathr://daily`) back into the app; a full in-thread
  game would duplicate engine logic in Swift, so prefer deep links.
- **Needs:** final art; an Expo config plugin for the extension targets.

## Couch mode

The TV/laptop shows the city; phones join with a room code and act as controllers.

- **Reuses:** the existing Worker rooms (Durable Objects + WebSockets in
  `worker/party-worker.js`) and `engine/party.ts`, which is pure TypeScript and can run
  inside the Worker as the room's authoritative state machine. Hand-off screens become
  unnecessary because every phone guesses privately.
- **Work:** replace the Worker's own 36-city list, ±2°C scoring and mock fallback with
  `engine/` (+ `weather-proxy.ts` for temperatures); add a "host screen" web route
  (big-screen layout) and a controller route; retire the Labs online party.
- **Open:** reconnect behaviour, max room size (12 to match Party), host migration.

## Home screen widget

Shows today's Daily (city, played or not) and the current streak.

- **Reuses:** `dailyIndex`, `dailyCity`, `dailyStreak` (pure, so the widget can compute
  the city offline).
- **Needs (needs approval):** native widget targets (WidgetKit on iOS, Glance/App
  Widgets on Android) via config plugins, and moving Daily history from AsyncStorage
  into storage both the app and widget can read (iOS App Group shared container).
  Show the city and streak only, never the temperature.

---

## Cross-cutting follow-ups

- Final Scrooby artwork (swap the emoji placeholder in `components/game/Scrooby.tsx`).
- Translate English-only strings (new strings fall back to English in `utils/i18n.ts`)
  and the forfeit deck.
- Move `services/audio.ts` from deprecated `expo-av` to `expo-audio`.
- Service worker: switch HTML to network-first so web deploys reach players promptly.
