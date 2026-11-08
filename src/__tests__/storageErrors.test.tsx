// T-95 (AC-02, AC-42): a failing storage write never escapes. The consent and the erase are caught and reported
// like the other stores, and the consent screen moves on even when the consent cannot be saved or applied.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from '../App';
import { deviceLanguageTags } from '../i18n/deviceLocale';
import { fr } from '../i18n/fr';
import { eraseGame } from '../storage/gameSave';
import { saveConsent } from '../telemetry/consentStore';
import { applyConsent, reportError } from '../telemetry/telemetry';
import { resetFastModeForTests } from '../testing/fastMode';

jest.mock('../telemetry/telemetry', () => ({
  ...jest.requireActual('../telemetry/telemetry'),
  applyConsent: jest.fn(() => Promise.resolve()),
  reportError: jest.fn(),
}));

const diskFull = () => new Error('disk full');

describe('storage write failures (T-95)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    resetFastModeForTests();
    jest.mocked(deviceLanguageTags).mockReturnValue(['fr-FR']);
  });

  it('saveConsent catches a rejected write and reports it', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(diskFull());
    await expect(saveConsent('granted')).resolves.toBeUndefined();
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), 'save_consent');
  });

  it('eraseGame catches a rejected removal and reports it', async () => {
    jest.mocked(AsyncStorage.removeItem).mockRejectedValueOnce(diskFull());
    await expect(eraseGame()).resolves.toBeUndefined();
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), 'erase_game');
  });

  it('the consent screen moves on to Home when the consent cannot be saved (AC-02)', async () => {
    await render(<App />);
    await screen.findByText(fr.consent.title);
    jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(diskFull());
    await fireEvent.press(screen.getByText(fr.consent.refuse));
    expect(await screen.findByText(fr.home.newGame)).toBeTruthy();
  });

  it('the consent screen moves on to Home when applying the consent throws (AC-02)', async () => {
    await render(<App />);
    await screen.findByText(fr.consent.title);
    jest.mocked(applyConsent).mockRejectedValueOnce(diskFull());
    await fireEvent.press(screen.getByText(fr.consent.accept));
    expect(await screen.findByText(fr.home.newGame)).toBeTruthy();
    expect(await AsyncStorage.getItem('telemetry.consent.v1')).toBe('granted');
  });
});
