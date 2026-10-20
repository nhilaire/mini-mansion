// The end: the title, the total play time and the number of captures, over the secret lab.
import { useEffect } from 'react';
import { BackHandler, StatusBar, StyleSheet, Text, View } from 'react-native';

import { playTimeParts } from '../game/progress';
import { GameState } from '../game/types';
import { useI18n } from '../i18n/I18nProvider';
import { Backdrop } from '../render/Backdrop';
import { Button } from '../ui/Button';
import { colors, font, spacing } from '../ui/theme';

export function EndingScreen({ state, onHome }: { state: GameState; onHome: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onHome();
      return true;
    });
    return () => sub.remove();
  }, [onHome]);
  const { h, mm } = playTimeParts(state.playMs);
  return (
    <View testID="ending-screen" style={styles.screen}>
      <StatusBar hidden />
      <Backdrop place={{ ...state, place: 'laundry' }} dim={0.55} />
      <View style={styles.panel}>
        <Text style={styles.title} accessibilityRole="header">
          {t.ending.title}
        </Text>
        <Text testID="ending-time" style={styles.time}>
          {t.ending.time(h, mm)}
        </Text>
        <Text testID="ending-captures" style={styles.text}>
          {t.ending.captures(state.captures)}
        </Text>
        <Button label={t.ending.home} onPress={onHome} testID="ending-home" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  panel: { width: 460, gap: spacing.md, padding: spacing.lg, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 2, alignItems: 'center' },
  title: { color: colors.accent, fontFamily: font.family, fontSize: 44, fontWeight: '800' },
  text: { color: colors.text, fontFamily: font.family, fontSize: font.body, textAlign: 'center', lineHeight: 22 },
  time: { color: colors.accent, fontFamily: font.family, fontSize: font.heading },
});
