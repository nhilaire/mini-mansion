// Sound settings, stored apart from the game save (they survive "Effacer la partie"). The language has its own key
// (src/storage/languageSetting.ts).
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Settings {
  sfx: boolean;
  music: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sfx: true, music: true };

const KEY = 'settings.v1';

export async function loadSettings(): Promise<Settings> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    const stored = json ? (JSON.parse(json) as Partial<Settings>) : {};
    return {
      sfx: typeof stored.sfx === 'boolean' ? stored.sfx : DEFAULT_SETTINGS.sfx,
      music: typeof stored.music === 'boolean' ? stored.music : DEFAULT_SETTINGS.music,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}
