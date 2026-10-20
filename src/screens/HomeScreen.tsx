import { useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';

import { appName } from '../config/app';
import { useI18n } from '../i18n/I18nProvider';
import { Backdrop } from '../render/Backdrop';
import { Button } from '../ui/Button';
import { colors, font, spacing } from '../ui/theme';

type Props = {
  // An unfinished save exists: "Continue" is offered and "New game" asks first.
  hasSave: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onSettings: () => void;
  onAbout: () => void;
};

export function HomeScreen({ hasSave, onContinue, onNewGame, onSettings, onAbout }: Props) {
  const { t, language } = useI18n();
  const [confirm, setConfirm] = useState(false);
  return (
    <View testID="home-screen" style={styles.screen}>
      <StatusBar hidden />
      <Backdrop dim={0.2} />
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title} accessibilityRole="header">
            {appName(language)}
          </Text>
          <Text style={styles.subtitle}>{t.home.subtitle}</Text>
        </View>
        {confirm ? (
          <View testID="home-confirm" style={styles.panel}>
            <Text style={styles.question}>{t.home.confirmNew}</Text>
            <View style={styles.row}>
              <Button label={t.common.yes} onPress={onNewGame} testID="home-confirm-yes" compact />
              <Button label={t.common.no} onPress={() => setConfirm(false)} variant="secondary" testID="home-confirm-no" compact />
            </View>
          </View>
        ) : (
          <View style={styles.menu}>
            {hasSave && <Button label={t.home.continue} onPress={onContinue} testID="home-continue" />}
            <Button
              label={t.home.newGame}
              onPress={() => (hasSave ? setConfirm(true) : onNewGame())}
              variant={hasSave ? 'secondary' : 'primary'}
              testID="home-new-game"
            />
            <View style={styles.row}>
              <Button label={t.home.settings} onPress={onSettings} variant="secondary" testID="home-settings" compact />
              <Button label={t.home.about} onPress={onAbout} variant="secondary" testID="home-about" compact />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, gap: spacing.xl },
  hero: { flex: 1, gap: spacing.sm },
  title: { color: colors.accent, fontSize: 40, fontWeight: '800', fontFamily: font.family, textShadowColor: '#000', textShadowRadius: 4 },
  subtitle: { color: colors.text, fontSize: font.heading, fontFamily: font.family, textShadowColor: '#000', textShadowRadius: 3 },
  menu: { width: 300, gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  panel: { width: 320, gap: spacing.md, padding: spacing.md, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 2 },
  question: { color: colors.text, fontSize: font.body, fontFamily: font.family, textAlign: 'center' },
});
