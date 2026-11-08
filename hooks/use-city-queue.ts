import { useCallback, useEffect, useRef } from 'react';
import { cityKey, pickCities } from '../engine/cities';
import { needsRefill, PREFETCH_TARGET } from '../engine/hot-or-cold';
import { CityWeather, DEFAULT_WEATHER_TTL_MS, withWeather } from '../engine/weather/client';
import { weatherClient } from '../services/weather';

/**
 * A queue of upcoming cities with weather already fetched, so endless modes
 * never wait between rounds. Refills in one batched request when it drops
 * below the low-water mark; cities whose weather fails are skipped.
 */
export function useCityQueue(target = PREFETCH_TARGET) {
  const queue = useRef<CityWeather[]>([]);
  const used = useRef(new Set<string>());
  const filling = useRef<Promise<void> | null>(null);

  const fill = useCallback((): Promise<void> => {
    if (filling.current) return filling.current;
    const run = (async () => {
      for (let attempt = 0; attempt < 3 && queue.current.length < target; attempt += 1) {
        const need = target - queue.current.length;
        let candidates = pickCities(need, { exclude: used.current, batchSize: need });
        if (candidates.length < need) {
          // Played through the whole pool: allow repeats again.
          used.current.clear();
          candidates = pickCities(need, { batchSize: need });
        }
        candidates.forEach(city => used.current.add(cityKey(city)));
        const { ok } = await withWeather(weatherClient, candidates);
        queue.current.push(...ok);
      }
    })().finally(() => {
      filling.current = null;
    });
    filling.current = run;
    return run;
  }, [target]);

  /** Next city with fresh weather, or null if weather is unavailable. */
  const take = useCallback(async (): Promise<CityWeather | null> => {
    for (let guard = 0; guard < target * 2; guard += 1) {
      if (queue.current.length === 0) await fill();
      const next = queue.current.shift();
      if (!next) return null;
      if (needsRefill(queue.current.length)) fill();

      // A reading that sat in the queue past the cache TTL is re-checked.
      if (Date.now() - next.weather.fetchedAt <= DEFAULT_WEATHER_TTL_MS) return next;
      const [fresh] = await weatherClient.getMany([next.city]);
      if (fresh) return { city: next.city, weather: fresh };
    }
    return null;
  }, [fill, target]);

  useEffect(() => {
    fill();
  }, [fill]);

  return { take };
}
