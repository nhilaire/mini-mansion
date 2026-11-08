// The single autosaved game (AsyncStorage). A corrupt or unknown-version save is ignored and reported (non-fatal).
import AsyncStorage from '@react-native-async-storage/async-storage';

import { deserialize, serialize } from '../game/save';
import { GameState } from '../game/types';
import { reportError } from '../telemetry/telemetry';

export const SAVE_KEY = 'game.save.v1';

export async function loadGame(): Promise<GameState | null> {
  let json: string | null;
  try {
    json = await AsyncStorage.getItem(SAVE_KEY);
  } catch (error) {
    reportError(error, 'load_game');
    return null;
  }
  if (json === null) return null;
  try {
    return deserialize(json);
  } catch (error) {
    reportError(error, 'corrupt_save');
    return null;
  }
}

export async function saveGame(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVE_KEY, serialize(state));
  } catch (error) {
    reportError(error, 'save_game');
  }
}

export async function eraseGame(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SAVE_KEY);
  } catch (error) {
    reportError(error, 'erase_game');
  }
}
