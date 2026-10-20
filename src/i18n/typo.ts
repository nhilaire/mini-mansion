// French typography: a no-break space (U+00A0) before ! ? : ; and inside « ». Content is written with plain spaces
// for readability and normalised once here.
export const NBSP = ' ';

export function typo(text: string): string {
  return text
    .replace(/ ([!?:;»])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`);
}

export function typoAll<T extends Record<string, string>>(map: T): T {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) out[k] = typo(v);
  return out as T;
}

// Plain spaces where French typography wants a no-break space (used by tests).
export function typographyErrors(text: string): string[] {
  const errors: string[] = [];
  if (/ [!?:;»]/.test(text)) errors.push('plain space before ! ? : ; »');
  if (/« /.test(text)) errors.push('plain space after «');
  if (/[^\s  ]([!?;»])/.test(text.replace(/[!?]{2,}/g, '!').replace(/\?!/g, '?'))) {
    // "!" right after a letter (no space at all), except inside « » closing handled above
    errors.push('missing no-break space before ! ? ; »');
  }
  return errors;
}
