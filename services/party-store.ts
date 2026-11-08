import { DEFAULT_ROUNDS } from '../engine/party';
import { DEFAULT_PENALTY_SETTINGS, PenaltySettings } from '../engine/penalty';
import { getJSON, setJSON, STORAGE_KEYS } from '../utils/storage';

export interface StoredPartySettings {
  players: string[];
  rounds: number;
  penalty: PenaltySettings;
  /** Someone confirmed the table is 18+ before enabling drinking rules. */
  ageConfirmed: boolean;
}

export const DEFAULT_PARTY_SETTINGS: StoredPartySettings = {
  players: ['', ''],
  rounds: DEFAULT_ROUNDS,
  penalty: DEFAULT_PENALTY_SETTINGS,
  ageConfirmed: false,
};

export async function loadPartySettings(): Promise<StoredPartySettings> {
  const stored = await getJSON<StoredPartySettings>(STORAGE_KEYS.partySettings, DEFAULT_PARTY_SETTINGS);
  return {
    ...stored,
    players: Array.isArray(stored.players) && stored.players.length >= 2 ? stored.players : DEFAULT_PARTY_SETTINGS.players,
    penalty: { ...DEFAULT_PENALTY_SETTINGS, ...stored.penalty },
  };
}

export async function savePartySettings(settings: StoredPartySettings): Promise<void> {
  await setJSON(STORAGE_KEYS.partySettings, settings);
}
