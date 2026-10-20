// Native modules are replaced by in-memory mocks so that tests run in Node.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({})),
  logEvent: jest.fn(() => Promise.resolve()),
  setConsent: jest.fn(() => Promise.resolve()),
  setAnalyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  getCrashlytics: jest.fn(() => ({})),
  log: jest.fn(),
  recordError: jest.fn(),
  setCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
}));

// Skia is native: a callable proxy stands in for every API, the canvas renders as a View and drawing nodes render
// nothing, so drawing code does not run in tests (it is proven by Maestro screenshots).
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = () => {
    const fn = () => proxy;
    const proxy = new Proxy(fn, { get: (_t, key) => (key === 'then' ? undefined : proxy), apply: () => proxy });
    return proxy;
  };
  const any = stub();
  const nothing = () => null;
  return {
    Skia: any,
    AlphaType: any,
    ColorType: any,
    FilterMode: any,
    MipmapMode: any,
    Canvas: ({ children, style }) => React.createElement(View, { style, testID: 'skia-canvas' }, children),
    Group: ({ children }) => React.createElement(React.Fragment, null, children),
    Image: nothing,
    Rect: nothing,
  };
});

// Audio players record what they are asked to do (tests check the toggles and the background pause).
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(() => Promise.resolve()), volume: 1, loop: false })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// The phone's languages: French by default; a test can switch with
// jest.mocked(deviceLanguageTags).mockReturnValue(['en-US']).
jest.mock('./src/i18n/deviceLocale', () => ({ deviceLanguageTags: jest.fn(() => ['fr-FR']) }));
