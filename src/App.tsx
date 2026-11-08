import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, View } from 'react-native';

import { music, sounds } from './audio/sound';
import { newGame } from './game/rules';
import { GameState } from './game/types';
import { LanguageSetting } from './i18n';
import { I18nProvider } from './i18n/I18nProvider';
import { AboutScreen } from './screens/AboutScreen';
import { ConsentScreen } from './screens/ConsentScreen';
import { EndingScreen } from './screens/EndingScreen';
import { GameScreen } from './screens/GameScreen';
import { HomeScreen } from './screens/HomeScreen';
import { IntroScreen } from './screens/IntroScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { eraseGame, loadGame, saveGame } from './storage/gameSave';
import { loadLanguageSetting, saveLanguageSetting } from './storage/languageSetting';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, Settings } from './storage/settings';
import { Consent, loadConsent, saveConsent } from './telemetry/consentStore';
import { gameStart, languageChange, settingsChange, Tracked } from './telemetry/gameTelemetry';
import { applyConsent, reportError, track } from './telemetry/telemetry';
import { applyTestingLink } from './testing/fastMode';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { colors } from './ui/theme';

type Route = 'home' | 'intro' | 'game' | 'settings' | 'about' | 'ending';

interface Session {
  key: number;
  initial: GameState;
  startPaused: boolean;
}

const send = (t: Tracked | null) => {
  if (t) track(t.name, t.params as never);
};

export default function App() {
  const [consent, setConsentState] = useState<Consent | 'loading'>('loading');
  const [route, setRoute] = useState<Route>('home');
  const [save, setSave] = useState<GameState | null>(null);
  const saveRef = useRef<GameState | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [languageSetting, setLanguageSetting] = useState<LanguageSetting>('auto');
  const [session, setSession] = useState<Session | null>(null);
  const [settingsReturn, setSettingsReturn] = useState<'home' | 'game'>('home');
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    let alive = true;
    (async () => {
      // Consent is applied before the save is read, so that a corrupt save can be reported (when allowed).
      const storedConsent = await loadConsent();
      if (storedConsent !== 'unknown') await applyConsent(storedConsent === 'granted');
      const [storedGame, storedSettings, storedLanguage, link] = await Promise.all([
        loadGame(),
        loadSettings(),
        loadLanguageSetting(),
        Linking.getInitialURL().catch(() => null),
      ]);
      applyTestingLink(link);
      sounds.enabled = storedSettings.sfx;
      if (alive) {
        saveRef.current = storedGame;
        setSave(storedGame);
        setSettings(storedSettings);
        setLanguageSetting(storedLanguage);
        setConsentState(storedConsent);
      }
    })();
    const linkSub = Linking.addEventListener('url', ({ url }) => applyTestingLink(url));
    const appSub = AppState.addEventListener('change', (st) => setForeground(st === 'active'));
    return () => {
      alive = false;
      linkSub.remove();
      appSub.remove();
    };
  }, []);

  // Music: the house theme everywhere, the ending theme on the ending screen; silent in background or when off.
  useEffect(() => {
    music.update({ enabled: settings.music && consent !== 'loading', foreground, track: route === 'ending' ? 'ending' : 'house' });
  }, [settings.music, foreground, route, consent]);

  const decide = useCallback(async (granted: boolean) => {
    const value = granted ? 'granted' : 'denied';
    // The consent screen always moves on, even if the choice cannot be saved or applied (reported, non-fatal).
    try {
      await saveConsent(value);
      await applyConsent(granted);
    } catch (error) {
      reportError(error, 'apply_consent');
    } finally {
      setConsentState(value);
    }
  }, []);

  const toggleTelemetry = useCallback(
    async (granted: boolean) => {
      await decide(granted);
      send(settingsChange('telemetry', granted));
    },
    [decide],
  );

  const changeLanguage = useCallback(async (value: LanguageSetting) => {
    setLanguageSetting(value);
    await saveLanguageSetting(value);
    send(languageChange(value));
  }, []);

  const persist = useCallback((s: GameState) => {
    saveRef.current = s;
    saveGame(s);
  }, []);

  const startGame = useCallback((initial: GameState, startPaused: boolean) => {
    setSession((cur) => ({ key: (cur?.key ?? 0) + 1, initial, startPaused }));
    setRoute('game');
  }, []);

  const onContinue = useCallback(() => {
    const s = saveRef.current;
    if (!s || s.finished) return;
    send(gameStart('continue'));
    startGame(s, false);
  }, [startGame]);

  const onIntroDone = useCallback(() => {
    const s = newGame();
    persist(s);
    setSave(s);
    send(gameStart('new'));
    startGame(s, false);
  }, [persist, startGame]);

  const leaveGame = useCallback(
    (s: GameState, to: Route) => {
      persist(s);
      setSave(s);
      setSession(null);
      setRoute(to);
    },
    [persist],
  );

  const changeSetting = useCallback(
    (key: keyof Settings, value: boolean) => {
      const next = { ...settings, [key]: value };
      setSettings(next);
      sounds.enabled = next.sfx;
      saveSettings(next);
      send(settingsChange(key, value));
    },
    [settings],
  );

  const settingsBack = useCallback(() => {
    if (settingsReturn === 'game' && saveRef.current && !saveRef.current.finished) startGame(saveRef.current, true);
    else setRoute('home');
  }, [settingsReturn, startGame]);

  const erase = useCallback(async () => {
    await eraseGame();
    saveRef.current = null;
    setSave(null);
    setSettingsReturn('home');
  }, []);

  const hasSave = save !== null && !save.finished;

  let content: React.ReactNode;
  if (consent === 'loading') {
    content = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  } else if (consent === 'unknown') {
    content = <ConsentScreen onDecision={decide} />;
  } else if (route === 'game' && session) {
    content = (
      <GameScreen
        key={session.key}
        initialState={session.initial}
        startPaused={session.startPaused}
        sfx={settings.sfx}
        onChange={persist}
        onEnding={(s) => leaveGame(s, 'ending')}
        onHome={(s) => leaveGame(s, 'home')}
        onSettings={(s) => {
          setSettingsReturn('game');
          leaveGame(s, 'settings');
        }}
      />
    );
  } else if (route === 'intro') {
    content = <IntroScreen onDone={onIntroDone} />;
  } else if (route === 'ending' && save) {
    content = <EndingScreen state={save} onHome={() => setRoute('home')} />;
  } else if (route === 'about') {
    content = <AboutScreen onBack={() => setRoute('home')} />;
  } else if (route === 'settings') {
    content = (
      <SettingsScreen
        settings={settings}
        telemetryEnabled={consent === 'granted'}
        hasSave={hasSave}
        onChange={changeSetting}
        onToggleTelemetry={toggleTelemetry}
        onLanguage={changeLanguage}
        onErase={erase}
        onBack={settingsBack}
      />
    );
  } else {
    content = (
      <HomeScreen
        hasSave={hasSave}
        onContinue={onContinue}
        onNewGame={() => setRoute('intro')}
        onSettings={() => {
          setSettingsReturn('home');
          setRoute('settings');
        }}
        onAbout={() => setRoute('about')}
      />
    );
  }

  return (
    <I18nProvider setting={languageSetting} onChange={changeLanguage}>
      <ErrorBoundary>{content}</ErrorBoundary>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
