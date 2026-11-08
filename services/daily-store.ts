import { addDailyResult, DailyHistory, DailyResult, EMPTY_DAILY_HISTORY } from '../engine/daily';
import { getJSON, setJSON, STORAGE_KEYS } from '../utils/storage';

/** Local Daily history (streaks are derived from it). */
export async function loadDailyHistory(): Promise<DailyHistory> {
  const history = await getJSON<DailyHistory>(STORAGE_KEYS.dailyHistory, EMPTY_DAILY_HISTORY);
  return Array.isArray(history.results) ? history : EMPTY_DAILY_HISTORY;
}

export async function saveDailyResult(result: DailyResult): Promise<DailyHistory> {
  const next = addDailyResult(await loadDailyHistory(), result);
  await setJSON(STORAGE_KEYS.dailyHistory, next);
  return next;
}
