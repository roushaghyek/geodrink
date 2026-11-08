import { useCallback, useEffect, useState } from 'react';
import { cityKey, pickCities } from '../engine/cities';
import { CityWeather, withWeather } from '../engine/weather/client';
import { weatherClient } from '../services/weather';

type Status = 'loading' | 'ready' | 'error';

/**
 * Load `count` random cities that all have live weather. Cities whose weather
 * fails are skipped and replaced from the pool; after a few attempts we give
 * up and report an error (with `reload` to retry).
 */
export function useWeatherCities(count: number) {
  const [status, setStatus] = useState<Status>('loading');
  const [rounds, setRounds] = useState<CityWeather[]>([]);

  const reload = useCallback(async () => {
    setStatus('loading');
    setRounds([]);
    const picked: CityWeather[] = [];
    const exclude = new Set<string>();
    for (let attempt = 0; attempt < 3 && picked.length < count; attempt += 1) {
      const need = count - picked.length;
      const candidates = pickCities(need + 2, { exclude });
      candidates.forEach(city => exclude.add(cityKey(city)));
      const { ok } = await withWeather(weatherClient, candidates);
      picked.push(...ok.slice(0, need));
    }
    if (picked.length >= count) {
      setRounds(picked);
      setStatus('ready');
    } else {
      setStatus('error');
    }
  }, [count]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { status, rounds, reload };
}
