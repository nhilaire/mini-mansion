// Five story cards before a new game (the rumour, Sam's investigation, the goal, the rule), over pixel pictures; tap to advance, "Skip" to skip.
import { useMemo, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';

import { newGame } from '../game/rules';
import { useI18n } from '../i18n/I18nProvider';
import { Backdrop } from '../render/Backdrop';
import { Button } from '../ui/Button';
import { colors, font, spacing } from '../ui/theme';

export function IntroScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [card, setCard] = useState(0);
  const front = useMemo(() => newGame(), []);
  const next = () => (card < t.intro.cards.length - 1 ? setCard(card + 1) : onDone());
  return (
    <View testID="intro-screen" style={styles.screen}>
      <StatusBar hidden />
      {card < 2 ? <Backdrop dim={0.35} /> : <Backdrop place={front} dim={0.45} />}
      <Pressable testID="intro-next" accessibilityRole="button" accessibilityLabel={t.intro.next} onPress={next} style={styles.tap}>
        <View style={styles.panel}>
          <Text testID={`intro-card-${card + 1}`} style={styles.text}>
            {t.intro.cards[card]}
          </Text>
          <Text style={styles.hint}>› {t.intro.next}</Text>
        </View>
      </Pressable>
      <View style={styles.skip}>
        <Button label={t.intro.skip} onPress={onDone} variant="secondary" testID="intro-skip" compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tap: { flex: 1, justifyContent: 'flex-end', padding: spacing.lg },
  panel: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 2, padding: spacing.md, gap: spacing.sm, marginHorizontal: '10%' },
  text: { color: colors.text, fontFamily: font.family, fontSize: 18, lineHeight: 26 },
  hint: { color: colors.accent, fontFamily: font.family, fontSize: font.small, textAlign: 'right' },
  skip: { position: 'absolute', top: spacing.md, right: spacing.lg },
});
