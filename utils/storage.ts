import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LanguageCode } from './i18n';

export interface GameStats {
  totalRounds: number;
  totalDifference: number;
  averageScore: number;
  timeWeightedScore: number;
  perfectAnswers: number; // Within 2°C
  bestStreak: number;
  gamesPlayed: number;
}

const STATS_KEY = '@weathr_stats';
const TEMP_UNIT_KEY = '@weathr_temp_unit';
const DARK_MODE_KEY = '@weathr_dark_mode';
const SESSION_ACTIVE_KEY = '@weathr_session_active';
const LANGUAGE_KEY = '@weathr_language';
const SOUND_EFFECTS_KEY = '@weathr_sound_effects';

const LEGACY_STORAGE_PREFIX = '@geo' + 'drink_';

const LEGACY_STORAGE_KEYS: Record<string, string> = {
  [STATS_KEY]: `${LEGACY_STORAGE_PREFIX}stats`,
  [TEMP_UNIT_KEY]: `${LEGACY_STORAGE_PREFIX}temp_unit`,
  [DARK_MODE_KEY]: `${LEGACY_STORAGE_PREFIX}dark_mode`,
  [SESSION_ACTIVE_KEY]: `${LEGACY_STORAGE_PREFIX}session_active`,
  [LANGUAGE_KEY]: `${LEGACY_STORAGE_PREFIX}language`,
  [SOUND_EFFECTS_KEY]: `${LEGACY_STORAGE_PREFIX}sound_effects`,
};

async function getMigratedItem(key: string): Promise<string | null> {
  const value = await AsyncStorage.getItem(key);
  if (value !== null) {
    return value;
  }

  const legacyKey = LEGACY_STORAGE_KEYS[key];
  if (!legacyKey) {
    return null;
  }

  const legacyValue = await AsyncStorage.getItem(legacyKey);
  if (legacyValue !== null) {
    await AsyncStorage.setItem(key, legacyValue);
  }

  return legacyValue;
}

export async function getGameStats(): Promise<GameStats> {
  try {
    const stats = await getMigratedItem(STATS_KEY);
    if (stats) {
      return JSON.parse(stats);
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
  
  return {
    totalRounds: 0,
    totalDifference: 0,
    averageScore: 0,
    timeWeightedScore: 0,
    perfectAnswers: 0,
    bestStreak: 0,
    gamesPlayed: 0,
  };
}

export async function updateGameStats(
  difference: number,
  timeInSeconds: number
): Promise<GameStats> {
  const stats = await getGameStats();
  
  stats.totalRounds += 1;
  stats.totalDifference += difference;
  stats.averageScore = stats.totalDifference / stats.totalRounds;
  
  // Calculate time bonus
  let timeBonus = 1.0;
  if (timeInSeconds <= 2) {
    timeBonus = 1.25; // 25% bonus
  } else if (timeInSeconds <= 5) {
    timeBonus = 1.10; // 10% bonus
  }
  
  // Time-weighted score (lower is better, so we invert the bonus)
  const timeWeightedDiff = difference / timeBonus;
  const prevTotal = stats.timeWeightedScore * (stats.totalRounds - 1);
  stats.timeWeightedScore = (prevTotal + timeWeightedDiff) / stats.totalRounds;
  
  // Check if within 2°C
  if (difference <= 2.0) {
    stats.perfectAnswers += 1;
  }
  
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}

export async function resetGameStats(): Promise<void> {
  const emptyStats: GameStats = {
    totalRounds: 0,
    totalDifference: 0,
    averageScore: 0,
    timeWeightedScore: 0,
    perfectAnswers: 0,
    bestStreak: 0,
    gamesPlayed: 0,
  };
  await AsyncStorage.setItem(STATS_KEY, JSON.stringify(emptyStats));
}

export async function getTempUnit(): Promise<'C' | 'F'> {
  try {
    const unit = await getMigratedItem(TEMP_UNIT_KEY);
    return (unit as 'C' | 'F') || 'C';
  } catch {
    return 'C';
  }
}

export async function setTempUnit(unit: 'C' | 'F'): Promise<void> {
  await AsyncStorage.setItem(TEMP_UNIT_KEY, unit);
}

export async function getDarkMode(): Promise<boolean> {
  try {
    const darkMode = await getMigratedItem(DARK_MODE_KEY);
    return darkMode === 'true';
  } catch {
    return false;
  }
}

export async function setDarkMode(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(DARK_MODE_KEY, enabled ? 'true' : 'false');
}

export async function getSessionActive(): Promise<boolean> {
  try {
    const sessionActive = await getMigratedItem(SESSION_ACTIVE_KEY);
    return sessionActive === 'true';
  } catch {
    return false;
  }
}

export async function setSessionActive(active: boolean): Promise<void> {
  await AsyncStorage.setItem(SESSION_ACTIVE_KEY, active ? 'true' : 'false');
}

export async function getLanguage(): Promise<LanguageCode> {
  try {
    const language = await getMigratedItem(LANGUAGE_KEY);
    if (language === 'ru' || language === 'fr' || language === 'de' || language === 'it' || language === 'es') {
      return language;
    }
  } catch {
    // Fall back to English when storage is unavailable.
  }

  return 'en';
}

export async function setLanguage(language: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
}

export async function getSoundEffectsEnabled(): Promise<boolean> {
  try {
    const enabled = await getMigratedItem(SOUND_EFFECTS_KEY);
    return enabled === null ? true : enabled === 'true';
  } catch {
    return true;
  }
}

export async function setSoundEffectsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(SOUND_EFFECTS_KEY, enabled ? 'true' : 'false');
}

export { celsiusToFahrenheit, fahrenheitToCelsius } from '../engine/scoring';

/** Typed JSON persistence for mode state (daily history, high scores, party settings). */
export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    const isPlainObject = (value: unknown) => typeof value === 'object' && value !== null && !Array.isArray(value);
    // Merge objects so settings saved by older versions pick up new defaults.
    if (isPlainObject(fallback) && isPlainObject(parsed)) return { ...fallback, ...parsed };
    return typeof parsed === typeof fallback && Array.isArray(parsed) === Array.isArray(fallback) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
}

export const STORAGE_KEYS = {
  dailyHistory: '@weathr_daily_history',
  hotColdBest: '@weathr_hot_cold_best',
  partySettings: '@weathr_party_settings',
  partyPlayers: '@weathr_party_players',
  onlinePartyEnabled: '@weathr_online_party_enabled',
} as const;
