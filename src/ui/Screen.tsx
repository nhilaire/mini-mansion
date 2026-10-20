import { ReactNode } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

import { colors, spacing } from './theme';

// Full-screen container (landscape, immersive: system bars are hidden).
export function Screen({ children, testID }: { children: ReactNode; testID?: string }) {
  return (
    <View testID={testID} style={styles.screen}>
      <StatusBar hidden />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, gap: spacing.sm },
});
