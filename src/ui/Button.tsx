import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, font, spacing } from './theme';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  testID?: string;
  compact?: boolean;
};

export function Button({ label, onPress, variant = 'primary', testID, compact }: Props) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.base, compact && styles.compact, primary ? styles.primary : styles.secondary, pressed && styles.pressed]}
    >
      <Text style={[styles.label, primary ? styles.primaryLabel : styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 46, borderRadius: 3, borderWidth: 2, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  compact: { minHeight: 44, paddingHorizontal: spacing.md, alignSelf: 'auto' },
  primary: { backgroundColor: colors.accent, borderColor: colors.border },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border },
  pressed: { opacity: 0.75 },
  label: { fontSize: font.body, fontWeight: '700', fontFamily: font.family },
  primaryLabel: { color: colors.accentText },
  secondaryLabel: { color: colors.text },
});
