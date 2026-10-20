import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { LANGUAGE_NAMES, LANGUAGES, LanguageSetting } from '../i18n';
import { useI18n } from '../i18n/I18nProvider';
import { Settings } from '../storage/settings';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { colors, font, spacing } from '../ui/theme';

type Props = {
  settings: Settings;
  telemetryEnabled: boolean;
  hasSave: boolean;
  onChange: (key: keyof Settings, value: boolean) => void;
  onToggleTelemetry: (granted: boolean) => void;
  onLanguage: (value: LanguageSetting) => void;
  onErase: () => void;
  onBack: () => void;
};

function Toggle({ label, help, value, onValueChange, testID }: { label: string; help?: string; value: boolean; onValueChange: (v: boolean) => void; testID: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        {help ? <Text style={styles.help}>{help}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} testID={testID} trackColor={{ true: colors.accent, false: colors.surface }} />
    </View>
  );
}

export function SettingsScreen({ settings, telemetryEnabled, hasSave, onChange, onToggleTelemetry, onLanguage, onErase, onBack }: Props) {
  const { t, setting } = useI18n();
  const [confirm, setConfirm] = useState(false);
  const [erased, setErased] = useState(false);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);
  const choices: { value: LanguageSetting; label: string }[] = [
    { value: 'auto', label: t.settings.languageAuto },
    ...LANGUAGES.map((language) => ({ value: language, label: LANGUAGE_NAMES[language] })),
  ];
  return (
    <Screen testID="settings-screen">
      <Text style={styles.title} accessibilityRole="header">
        {t.settings.title}
      </Text>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.columns}>
          <View style={styles.column}>
            <Toggle label={t.settings.sfx} value={settings.sfx} onValueChange={(v) => onChange('sfx', v)} testID="settings-sfx" />
            <Toggle label={t.settings.music} value={settings.music} onValueChange={(v) => onChange('music', v)} testID="settings-music" />
            <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={t.settings.language}>
              <Text style={styles.label}>{t.settings.language}</Text>
              {choices.map(({ value, label }) => {
                const selected = value === setting;
                return (
                  <Pressable
                    key={value}
                    testID={`settings-language-${value}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={label}
                    onPress={() => onLanguage(value)}
                    style={[styles.choice, selected && styles.choiceSelected]}
                  >
                    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.column}>
            <Toggle label={t.settings.telemetry} help={t.settings.telemetryHelp} value={telemetryEnabled} onValueChange={onToggleTelemetry} testID="settings-telemetry" />
            {confirm ? (
              <View testID="settings-confirm" style={styles.confirm}>
                <Text style={styles.label}>{t.settings.confirmErase}</Text>
                <View style={styles.buttons}>
                  <Button
                    label={t.common.yes}
                    onPress={() => {
                      setConfirm(false);
                      setErased(true);
                      onErase();
                    }}
                    testID="settings-erase-yes"
                    compact
                  />
                  <Button label={t.common.no} onPress={() => setConfirm(false)} variant="secondary" testID="settings-erase-no" compact />
                </View>
              </View>
            ) : hasSave ? (
              <Button label={t.settings.erase} onPress={() => setConfirm(true)} variant="secondary" testID="settings-erase" />
            ) : erased ? (
              <Text style={styles.help}>{t.settings.erased}</Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
      <Button label={t.settings.back} onPress={onBack} variant="secondary" testID="settings-back" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.accent, fontSize: font.heading, fontWeight: '800', fontFamily: font.family },
  body: { paddingBottom: spacing.sm },
  columns: { flexDirection: 'row', gap: spacing.md },
  column: { flex: 1, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: spacing.sm },
  rowText: { flex: 1, gap: spacing.xs },
  label: { color: colors.text, fontSize: font.body, fontWeight: '600', fontFamily: font.family },
  help: { color: colors.muted, fontSize: font.small, fontFamily: font.family },
  group: { gap: spacing.xs, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: spacing.sm },
  choice: { minHeight: 44, paddingHorizontal: spacing.md, justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  choiceSelected: { borderColor: colors.accent },
  choiceText: { color: colors.muted, fontSize: font.body, fontFamily: font.family },
  choiceTextSelected: { color: colors.text, fontWeight: '700' },
  confirm: { gap: spacing.sm, padding: spacing.sm, borderColor: colors.border, borderWidth: 1 },
  buttons: { flexDirection: 'row', gap: spacing.sm },
});
