// T-19 / T-20 / T-21: the app flow - consent, languages, home, intro, continue, settings, about, persistence.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { appName } from '../config/app';
import { newGame } from '../game/rules';
import { serialize } from '../game/save';
import { DICTIONARIES } from '../i18n';
import { deviceLanguageTags } from '../i18n/deviceLocale';
import { fr } from '../i18n/fr';
import { SAVE_KEY } from '../storage/gameSave';
import { resetFastModeForTests } from '../testing/fastMode';

// render/fireEvent are awaited: asynchronous in React Native Testing Library 14+.
const denied = () => AsyncStorage.setItem('telemetry.consent.v1', 'denied');
const en = DICTIONARIES.en;

describe('App', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetFastModeForTests();
    jest.mocked(deviceLanguageTags).mockReturnValue(['fr-FR']);
  });

  it('asks for consent in French on a French phone, then shows the home screen (AC-01, AC-02, AC-10)', async () => {
    await render(<App />);
    expect(await screen.findByText(fr.consent.title)).toBeTruthy();
    expect(screen.getByText(fr.consent.accept)).toBeTruthy();
    await fireEvent.press(screen.getByText(fr.consent.refuse));
    expect(await screen.findByText(fr.home.newGame)).toBeTruthy();
    expect(screen.getByText(appName('fr'))).toBeTruthy();
    expect(screen.getByText(fr.home.subtitle)).toBeTruthy();
    expect(screen.getByText(fr.home.settings)).toBeTruthy();
    expect(screen.getByText(fr.home.about)).toBeTruthy();
    expect(screen.queryByTestId('home-continue')).toBeNull();
  });

  it('speaks English on an English phone and on a phone in an unsupported language (AC-01, AC-03)', async () => {
    jest.mocked(deviceLanguageTags).mockReturnValue(['en-US']);
    const first = await render(<App />);
    expect(await screen.findByText(en.consent.title)).toBeTruthy();
    await first.unmount();
    jest.mocked(deviceLanguageTags).mockReturnValue(['it-IT']);
    await denied();
    await render(<App />);
    expect(await screen.findByText(en.home.newGame)).toBeTruthy();
    expect(screen.getByText(en.home.subtitle)).toBeTruthy();
  });

  it('accepting also leads home and is remembered on the next launch (AC-02)', async () => {
    const first = await render(<App />);
    await fireEvent.press(await screen.findByText(fr.consent.accept));
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
    expect(await AsyncStorage.getItem('telemetry.consent.v1')).toBe('granted');
    await first.unmount();
    await render(<App />);
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
    expect(screen.queryByText(fr.consent.title)).toBeNull();
  });

  it('turning statistics on logs settings_change after consent is granted; off sends nothing (AC-06)', async () => {
    const { logEvent, setConsent } = jest.requireMock('@react-native-firebase/analytics');
    await denied();
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-settings'));
    jest.clearAllMocks();
    await fireEvent(screen.getByTestId('settings-telemetry'), 'valueChange', true);
    await act(async () => {});
    const granted = setConsent.mock.calls.findIndex((c: [unknown, { analytics_storage: boolean }]) => c[1].analytics_storage === true);
    const logged = logEvent.mock.calls.findIndex((c: unknown[]) => c[1] === 'settings_change');
    expect(granted).toBeGreaterThanOrEqual(0);
    expect(logEvent.mock.calls[logged]).toEqual([expect.anything(), 'settings_change', { setting: 'telemetry', value: 'on' }]);
    expect(setConsent.mock.invocationCallOrder[granted]).toBeLessThan(logEvent.mock.invocationCallOrder[logged]);
    jest.clearAllMocks();
    await fireEvent(screen.getByTestId('settings-telemetry'), 'valueChange', false);
    await act(async () => {});
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('a corrupt save is ignored and reported as a non-fatal error when statistics are on (AC-35)', async () => {
    const { recordError } = jest.requireMock('@react-native-firebase/crashlytics');
    recordError.mockClear();
    await AsyncStorage.setItem('telemetry.consent.v1', 'granted');
    await AsyncStorage.setItem(SAVE_KEY, '{broken');
    await render(<App />);
    await screen.findByTestId('home-new-game');
    expect(screen.queryByTestId('home-continue')).toBeNull();
    expect(recordError).toHaveBeenCalledTimes(1);
  });

  it('home shows Continue only when an unfinished save exists (AC-10)', async () => {
    await denied();
    await AsyncStorage.setItem(SAVE_KEY, serialize({ ...newGame(), place: 'living' }));
    await render(<App />);
    expect(await screen.findByTestId('home-continue')).toBeTruthy();
  });

  it('a finished save only offers a new game, without confirmation: killed during the ending, nothing resumes (AC-50)', async () => {
    await denied();
    await AsyncStorage.setItem(SAVE_KEY, serialize({ ...newGame(), finished: true, flags: { ending: true } }));
    await render(<App />);
    await screen.findByTestId('home-new-game');
    expect(screen.queryByTestId('home-continue')).toBeNull();
    await fireEvent.press(screen.getByTestId('home-new-game'));
    expect(await screen.findByTestId('intro-screen')).toBeTruthy();
  });

  it('new game: 3 intro cards, then the front of the house with the first tutorial bubble, saved at once (AC-11)', async () => {
    await denied();
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-new-game'));
    expect(screen.getByText(fr.intro.cards[0])).toBeTruthy();
    await fireEvent.press(screen.getByTestId('intro-next'));
    expect(screen.getByText(fr.intro.cards[1])).toBeTruthy();
    await fireEvent.press(screen.getByTestId('intro-next'));
    expect(screen.getByText(fr.intro.cards[2])).toBeTruthy();
    await fireEvent.press(screen.getByTestId('intro-next'));
    expect(await screen.findByTestId('game-screen')).toBeTruthy();
    expect(screen.getByText(fr.tutorial.walk)).toBeTruthy();
    expect(screen.getByTestId('hs-front.doormat')).toBeTruthy();
    expect(JSON.parse((await AsyncStorage.getItem(SAVE_KEY))!).place).toBe('front');
  });

  it('asks before replacing a game in progress (AC-37)', async () => {
    await denied();
    await AsyncStorage.setItem(SAVE_KEY, serialize({ ...newGame(), place: 'garage', inventory: ['pole'], flags: { pole_taken: true, door_unlocked: true } }));
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-new-game'));
    expect(screen.getByText(fr.home.confirmNew)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-confirm-no'));
    expect(screen.getByTestId('home-continue')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-new-game'));
    await fireEvent.press(screen.getByTestId('home-confirm-yes'));
    await fireEvent.press(screen.getByTestId('intro-skip'));
    expect(await screen.findByTestId('game-screen')).toBeTruthy();
    expect(JSON.parse((await AsyncStorage.getItem(SAVE_KEY))!).inventory).toEqual([]);
  });

  it('continue restores the saved place and inventory (AC-36)', async () => {
    await denied();
    await AsyncStorage.setItem(SAVE_KEY, serialize({ ...newGame(), place: 'garage', inventory: ['pole'], flags: { pole_taken: true, door_unlocked: true }, tutorial: 3 }));
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-continue'));
    expect(await screen.findByTestId('hs-garage.crate')).toBeTruthy();
    expect(screen.getByTestId('inv-pole')).toBeTruthy();
  });

  it('settings: toggles persist, erasing removes Continue but keeps settings and consent (AC-42)', async () => {
    await denied();
    await AsyncStorage.setItem(SAVE_KEY, serialize(newGame()));
    const first = await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-settings'));
    expect(screen.getByText(fr.settings.sfx)).toBeTruthy();
    expect(screen.getByText(fr.settings.music)).toBeTruthy();
    expect(screen.getByText(fr.settings.telemetry)).toBeTruthy();
    expect(screen.getByText(fr.settings.language)).toBeTruthy();
    await fireEvent(screen.getByTestId('settings-music'), 'valueChange', false);
    await fireEvent.press(screen.getByTestId('settings-erase'));
    expect(screen.getByText(fr.settings.confirmErase)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('settings-erase-yes'));
    await act(async () => {});
    expect(await AsyncStorage.getItem(SAVE_KEY)).toBeNull();
    await fireEvent.press(screen.getByTestId('settings-back'));
    expect(screen.queryByTestId('home-continue')).toBeNull();
    await first.unmount();
    await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-settings'));
    expect(screen.getByTestId('settings-music').props.value).toBe(false);
    expect(screen.getByTestId('settings-sfx').props.value).toBe(true);
    expect(await AsyncStorage.getItem('telemetry.consent.v1')).toBe('denied');
  });

  it('switches the whole UI language at once, remembers it, and "Automatic" follows the phone again (AC-04)', async () => {
    const { logEvent } = jest.requireMock('@react-native-firebase/analytics');
    await AsyncStorage.setItem('telemetry.consent.v1', 'granted');
    const first = await render(<App />);
    await fireEvent.press(await screen.findByTestId('home-settings'));
    logEvent.mockClear();
    await fireEvent.press(screen.getByTestId('settings-language-en'));
    expect(await screen.findByText(en.settings.title)).toBeTruthy();
    expect(screen.getByText(en.settings.sfx)).toBeTruthy();
    expect(await AsyncStorage.getItem('settings.language.v1')).toBe('en');
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'settings_change', { setting: 'language', value: 'en' });
    await first.unmount();
    await render(<App />);
    expect(await screen.findByText(en.home.newGame)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-settings'));
    await fireEvent.press(screen.getByTestId('settings-language-auto'));
    expect(await screen.findByText(fr.settings.title)).toBeTruthy();
  });

  it.each(['fr', 'en'] as const)('shows the About screen in %s: story, word from the author, data, version (AC-44)', async (language) => {
    jest.mocked(deviceLanguageTags).mockReturnValue([language === 'fr' ? 'fr-FR' : 'en-GB']);
    const t = DICTIONARIES[language];
    await denied();
    await render(<App />);
    await fireEvent.press(await screen.findByText(t.home.about));
    expect(screen.getByTestId('about-screen')).toBeTruthy();
    expect(screen.getByText(t.about.storyTitle)).toBeTruthy();
    expect(screen.getByText(t.about.story[0])).toBeTruthy();
    expect(screen.getByText(/Maniac Mansion/)).toBeTruthy();
    expect(screen.getByText(t.about.author[0])).toBeTruthy();
    expect(screen.getByText(/^Version [0-9]+[.][0-9]+[.][0-9]+$/)).toBeTruthy();
  });
});
