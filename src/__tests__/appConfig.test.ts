// T-16 / AC-05 support: launcher names per language, landscape, immersive plugin, testing deep-link scheme, privacy.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require('../../app.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const makeConfig = require('../../app.config.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const meta = require('../../factory-app.json');

describe('Expo config (AC-05)', () => {
  const config = makeConfig({ config: appJson.expo });
  const plugins = config.plugins.map((p: string | [string, unknown]) => (Array.isArray(p) ? p[0] : p));

  it('shows "Mini Mansion" under the icon in French and in English', () => {
    expect(meta.displayName).toBe('Mini Mansion');
    expect(config.name).toBe('Mini Mansion');
    expect(config.locales.fr.android.app_name).toBe('Mini Mansion');
    expect(config.locales.en.android.app_name).toBe('Mini Mansion');
  });

  it('runs in landscape, fullscreen, with release signing', () => {
    expect(config.orientation).toBe('landscape');
    expect(plugins).toContain('./plugins/with-fullscreen');
    expect(plugins).toContain('./plugins/with-release-signing');
    expect(plugins).toContain('expo-localization');
  });

  it('declares the testing deep-link scheme and blocks the advertising ID', () => {
    expect(config.scheme).toBe('minimansion');
    expect(config.android.blockedPermissions).toContain('com.google.android.gms.permission.AD_ID');
  });

  it('uses the generated dusk icon and splash', () => {
    expect(config.icon).toBe('./assets/icon.png');
    expect(config.android.adaptiveIcon.backgroundColor).toBe('#2a2c5e');
    const splash = config.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen');
    expect(splash[1].image).toBe('./assets/splash-icon.png');
  });
});
