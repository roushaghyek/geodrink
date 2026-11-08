import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/game/ScreenHeader';
import { Segmented } from '../components/game/Segmented';
import { useLanguage } from '../contexts/LanguageContext';
import { useTempUnit } from '../contexts/TempUnitContext';
import { MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS, parsePartyConfig, ROUND_OPTIONS } from '../engine/party';
import { CAP_OPTIONS, DEGREES_PER_POINT_OPTIONS, PenaltyMode } from '../engine/penalty';
import { deltaToUnit } from '../engine/scoring';
import { usePalette } from '../hooks/use-palette';
import { DEFAULT_PARTY_SETTINGS, loadPartySettings, savePartySettings, StoredPartySettings } from '../services/party-store';
import { toRgba } from '../utils/theme-colors';

export default function PartySetupScreen() {
  const router = useRouter();
  const colors = usePalette();
  const { t } = useLanguage();
  const { unit } = useTempUnit();
  const [settings, setSettings] = useState<StoredPartySettings>(DEFAULT_PARTY_SETTINGS);
  const [showAgeGate, setShowAgeGate] = useState(false);

  useEffect(() => {
    loadPartySettings().then(setSettings);
  }, []);

  const update = (patch: Partial<StoredPartySettings>) => setSettings(previous => ({ ...previous, ...patch }));
  const setPenalty = (patch: Partial<StoredPartySettings['penalty']>) =>
    setSettings(previous => ({ ...previous, penalty: { ...previous.penalty, ...patch } }));

  const trimmed = settings.players.map(name => name.trim());
  const hasDuplicates = new Set(trimmed.filter(Boolean).map(name => name.toLowerCase())).size !== trimmed.filter(Boolean).length;
  const config = parsePartyConfig({ players: settings.players, rounds: settings.rounds, unit, penalty: settings.penalty });

  const choosePenaltyMode = (mode: PenaltyMode) => {
    if (mode === 'drinks' && !settings.ageConfirmed) {
      setShowAgeGate(true);
      return;
    }
    setShowAgeGate(false);
    setPenalty({ mode });
  };

  const confirmAge = () => {
    setShowAgeGate(false);
    setSettings(previous => ({ ...previous, ageConfirmed: true, penalty: { ...previous.penalty, mode: 'drinks' } }));
  };

  const start = async () => {
    if (!config) return;
    await savePartySettings({ ...settings, players: config.players });
    router.push({ pathname: '/party', params: { config: JSON.stringify(config) } } as never);
  };

  const formatDegrees = (celsius: number) => `${Math.round(deltaToUnit(celsius, unit))}°${unit}`;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <ScreenHeader title={t('partySetup')} />

          <Text style={[styles.label, { color: colors.foreground }]} accessibilityRole="header">
            {t('players')} ({settings.players.length}/{MAX_PLAYERS})
          </Text>
          {settings.players.map((name, index) => (
            <View key={index} style={styles.playerRow}>
              <TextInput
                style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={name}
                onChangeText={text => update({ players: settings.players.map((p, i) => (i === index ? text.slice(0, MAX_NAME_LENGTH) : p)) })}
                placeholder={t('playerPlaceholder', { number: index + 1 })}
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                returnKeyType="next"
                accessibilityLabel={t('playerPlaceholder', { number: index + 1 })}
                testID={`player-name-${index}`}
              />
              {settings.players.length > MIN_PLAYERS ? (
                <Pressable
                  style={styles.remove}
                  onPress={() => update({ players: settings.players.filter((_, i) => i !== index) })}
                  accessibilityRole="button"
                  accessibilityLabel={t('removePlayer', { name: name || t('playerPlaceholder', { number: index + 1 }) })}
                >
                  <Ionicons name="close-circle" size={26} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {hasDuplicates ? <Text style={[styles.warning, { color: colors.destructive }]}>{t('duplicateNames')}</Text> : null}
          {settings.players.length < MAX_PLAYERS ? (
            <Pressable
              style={[styles.addButton, { borderColor: colors.brand }]}
              onPress={() => update({ players: [...settings.players, ''] })}
              accessibilityRole="button"
              accessibilityLabel={t('addPlayer')}
              testID="add-player-button"
            >
              <Ionicons name="add" size={20} color={colors.brand} />
              <Text style={[styles.addText, { color: colors.brand }]}>{t('addPlayer')}</Text>
            </Pressable>
          ) : null}

          <Text style={[styles.label, { color: colors.foreground }]} accessibilityRole="header">
            {t('rounds')}
          </Text>
          <Segmented
            label={t('rounds')}
            options={ROUND_OPTIONS.map(value => ({ value, label: String(value) }))}
            value={settings.rounds}
            onChange={rounds => update({ rounds })}
            testIDPrefix="rounds"
          />

          <Text style={[styles.label, { color: colors.foreground }]} accessibilityRole="header">
            {t('penalty')}
          </Text>
          <Segmented<PenaltyMode>
            label={t('penalty')}
            options={[
              { value: 'forfeits', label: t('forfeits') },
              { value: 'drinks', label: t('drinks') },
            ]}
            value={settings.penalty.mode}
            onChange={choosePenaltyMode}
            testIDPrefix="penalty-mode"
          />

          {showAgeGate ? (
            <View style={[styles.gate, { borderColor: colors.chart5, backgroundColor: toRgba(colors.chart5, 0.1) }]} accessibilityLiveRegion="polite" testID="age-gate">
              <Text style={[styles.gateTitle, { color: colors.foreground }]}>{t('ageGateTitle')}</Text>
              <Text style={[styles.gateBody, { color: colors.foreground }]}>{t('ageGateBody')}</Text>
              <Text style={[styles.gateBody, { color: colors.mutedForeground }]}>{t('drinkResponsibly')}</Text>
              <View style={styles.gateButtons}>
                <Pressable style={[styles.gateButton, { borderColor: colors.border }]} onPress={() => setShowAgeGate(false)} accessibilityRole="button">
                  <Text style={[styles.gateButtonText, { color: colors.foreground }]}>{t('cancel')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.gateButton, { backgroundColor: colors.brand, borderColor: colors.brand }]}
                  onPress={confirmAge}
                  accessibilityRole="button"
                  testID="age-gate-confirm"
                >
                  <Text style={[styles.gateButtonText, { color: colors.brandForeground }]}>{t('ageGateConfirm')}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          {settings.penalty.mode === 'drinks' && !showAgeGate ? (
            <Text style={[styles.note, { color: colors.mutedForeground }]} testID="drink-responsibly-note">
              🥤 {t('drinkResponsibly')}
            </Text>
          ) : null}

          <Text style={[styles.explainer, { color: colors.mutedForeground }]}>{t('penaltyExplainer')}</Text>
          <Text style={[styles.subLabel, { color: colors.foreground }]}>{t('penaltyScale')}</Text>
          <Segmented
            label={t('penaltyScale')}
            options={DEGREES_PER_POINT_OPTIONS.map(value => ({ value, label: formatDegrees(value) }))}
            value={settings.penalty.degreesPerPoint}
            onChange={degreesPerPoint => setPenalty({ degreesPerPoint })}
          />
          <Text style={[styles.subLabel, { color: colors.foreground }]}>{t('penaltyCap')}</Text>
          <Segmented
            label={t('penaltyCap')}
            options={CAP_OPTIONS.map(value => ({ value, label: String(value) }))}
            value={settings.penalty.capPerRound}
            onChange={capPerRound => setPenalty({ capPerRound })}
          />

          <Pressable
            style={[styles.start, { backgroundColor: colors.brand }, !config && styles.disabled]}
            onPress={start}
            disabled={!config}
            accessibilityRole="button"
            accessibilityLabel={t('startParty')}
            accessibilityState={{ disabled: !config }}
            testID="start-party-button"
          >
            <Text style={[styles.startText, { color: colors.brandForeground }]}>{t('startParty')}</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.brandForeground} />
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  label: { fontSize: 17, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  subLabel: { fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 8 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  nameInput: { flex: 1, fontSize: 17, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 48 },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  warning: { fontSize: 14, marginBottom: 8 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, minHeight: 48, marginTop: 4 },
  addText: { fontSize: 16, fontWeight: '700' },
  gate: { borderWidth: 1.5, borderRadius: 16, padding: 16, marginTop: 12, gap: 8 },
  gateTitle: { fontSize: 17, fontWeight: '800' },
  gateBody: { fontSize: 15, lineHeight: 21 },
  gateButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  gateButton: { flex: 1, borderWidth: 1, borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  gateButtonText: { fontSize: 16, fontWeight: '700' },
  note: { fontSize: 14, lineHeight: 20, marginTop: 10 },
  explainer: { fontSize: 14, lineHeight: 20, marginTop: 14 },
  start: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 16, minHeight: 56, marginTop: 28 },
  startText: { fontSize: 19, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
