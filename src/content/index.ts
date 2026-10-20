// Access to the story content of the current language. Unknown keys fall back to the key itself (and a test makes
// sure every key the engine can emit exists in every language).
import type { CharacterId, ItemId, NoteId, Speaker } from '../game/types';
import type { Strings } from '../i18n/types';

export function line(t: Strings, key: string): string {
  return (t.story.lines as Record<string, string>)[key] ?? key;
}

export function hasLine(t: Strings, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(t.story.lines, key);
}

export function itemName(t: Strings, item: ItemId): string {
  return t.story.names.items[item];
}

export function speakerName(t: Strings, speaker: Speaker): string {
  return t.story.names.speakers[speaker];
}

// Accessibility label and action menu title of a hotspot or character.
export function hotspotName(t: Strings, id: string): string {
  const speakers = t.story.names.speakers as Record<string, string>;
  if (id in speakers && id !== 'hero' && id !== 'narrator') return speakers[id as CharacterId];
  return (t.story.names.hotspots as Record<string, string>)[id] ?? id;
}

export function exitName(t: Strings, id: string): string {
  return (t.story.names.exits as Record<string, string>)[id] ?? id;
}

export function noteText(t: Strings, note: NoteId): string {
  return t.story.notes[note];
}
