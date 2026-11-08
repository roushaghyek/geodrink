import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CityCard } from '../components/game/CityCard';
import { ResultReveal } from '../components/game/ResultReveal';
import { ScreenHeader } from '../components/game/ScreenHeader';
import { TemperatureGuessInput } from '../components/game/TemperatureGuessInput';
import { DemoWeatherBadge, WeatherError } from '../components/game/WeatherNotice';
import { useLanguage } from '../contexts/LanguageContext';
import { useTempUnit } from '../contexts/TempUnitContext';
import {
  dailyCity,
  dailyIndex,
  dailyNumber,
  dailyShareText,
  dailyStreak,
  DailyHistory,
  findDailyResult,
  msUntilNextDaily,
  newDailyResult,
} from '../engine/daily';
import { evaluateGuess, toDisplayTemp } from '../engine/scoring';
import { gameTemperature } from '../engine/weather/types';
import { usePalette } from '../hooks/use-palette';
import { loadDailyHistory, saveDailyResult } from '../services/daily-store';
import { loadSounds, playCorrectSound, playWrongSound, unloadSounds } from '../services/audio';
import { weatherClient } from '../services/weather';
import { canUseWebShareSheet, shareText, ShareOutcome } from '../utils/share';
import { toRgba } from '../utils/theme-colors';

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatUtcTime(ms: number): string {
  return `${new Date(ms).toISOString().slice(11, 16)} UTC`;
}

export default function DailyScreen() {
  const colors = usePalette();
  const { t } = useLanguage();
  const { unit } = useTempUnit();
  // The puzzle is fixed for this visit, even if the clock passes midnight UTC.
  const [day] = useState(() => dailyIndex());
  const city = useMemo(() => dailyCity(day), [day]);
  const [history, setHistory] = useState<DailyHistory | null>(null);
  const [guess, setGuess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const [shareStatus, setShareStatus] = useState<ShareOutcome | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    loadDailyHistory().then(setHistory);
    // Warm the cache so the reveal is instant; scoring re-reads at guess time.
    weatherClient.get(city).catch(() => undefined);
    loadSounds();
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearInterval(timer);
      unloadSounds();
    };
  }, [city]);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(false);
    try {
      const observation = await weatherClient.get(city);
      const actualC = gameTemperature(observation);
      const evaluation = evaluateGuess(Number(guess), unit, actualC);
      const result = newDailyResult(day, city, evaluation.guessC, actualC, observation.observedAt);
      setHistory(await saveDailyResult(result));
      if (evaluation.offC <= 3) playCorrectSound();
      else playWrongSound();
    } catch {
      // The attempt is not used up: the player can retry with the same guess.
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }, [city, day, guess, unit]);

  const result = history ? findDailyResult(history, day) : undefined;
  const streak = history ? dailyStreak(history, day) : { current: 0, best: 0, played: 0 };

  const share = async (preferSheet: boolean) => {
    if (!result) return;
    setShareStatus(await shareText(dailyShareText(result, streak.current, unit), preferSheet));
  };

  const header = <ScreenHeader title={t('daily')} right={<Text style={[styles.number, { color: colors.mutedForeground }]}>#{dailyNumber(day)}</Text>} />;

  if (!history) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.pad}>{header}</View>
        <ActivityIndicator size="large" color={colors.brand} />
      </SafeAreaView>
    );
  }

  if (error && !result) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.pad}>{header}</View>
        <WeatherError onRetry={submit} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          {header}
          <DemoWeatherBadge />
          <CityCard city={city.city} country={city.country} />

          {!result ? (
            <>
              <Text style={[styles.prompt, { color: colors.foreground }]}>{t('dailyPrompt')}</Text>
              <TemperatureGuessInput
                value={guess}
                onChange={setGuess}
                onSubmit={submit}
                unit={unit}
                submitLabel={submitting ? t('checkingLiveTemp') : t('submitGuess')}
                inputLabel={t('currentTemperatureQuestion')}
                disabled={submitting}
              />
            </>
          ) : (
            <>
              <Text style={[styles.done, { color: colors.mutedForeground }]}>{t('dailyDone')}</Text>
              <ResultReveal
                guessInUnit={toDisplayTemp(result.guessC, unit)}
                unit={unit}
                actualC={result.actualC}
                footnote={t('liveTempAt', { time: formatUtcTime(result.observedAt) })}
              />

              <View style={[styles.streakRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Stat label={t('currentStreak')} value={`🔥 ${streak.current}`} testID="daily-streak" />
                <Stat label={t('bestStreak')} value={String(streak.best)} />
                <Stat label={t('played')} value={String(streak.played)} />
              </View>

              <Pressable
                style={[styles.primary, { backgroundColor: colors.brand }]}
                onPress={() => share(Platform.OS !== 'web')}
                accessibilityRole="button"
                accessibilityLabel={t('shareResult')}
                testID="daily-share-button"
              >
                <Ionicons name={Platform.OS === 'web' ? 'copy-outline' : 'share-outline'} size={20} color={colors.brandForeground} />
                <Text style={[styles.primaryText, { color: colors.brandForeground }]}>{t('shareResult')}</Text>
              </Pressable>
              {canUseWebShareSheet() ? (
                <Pressable style={styles.secondary} onPress={() => share(true)} accessibilityRole="button" accessibilityLabel={t('shareMore')}>
                  <Ionicons name="share-outline" size={18} color={colors.brand} />
                  <Text style={[styles.secondaryText, { color: colors.brand }]}>{t('shareMore')}</Text>
                </Pressable>
              ) : null}
              {shareStatus && shareStatus !== 'cancelled' ? (
                <Text style={[styles.shareStatus, { color: colors.mutedForeground }]} accessibilityLiveRegion="polite" testID="share-status">
                  {shareStatus === 'copied' ? t('copied') : shareStatus === 'shared' ? t('shared') : t('shareFailed')}
                </Text>
              ) : null}

              <View style={[styles.countdown, { backgroundColor: toRgba(colors.brand, 0.08) }]}>
                <Ionicons name="time-outline" size={18} color={colors.brand} />
                <Text style={[styles.countdownText, { color: colors.foreground }]}>{t('nextDailyIn', { time: formatCountdown(msUntilNextDaily(now)) })}</Text>
              </View>
              <Text style={[styles.note, { color: colors.mutedForeground }]}>{t('liveTempNote')}</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Stat({ label, value, testID }: { label: string; value: string; testID?: string }) {
  const colors = usePalette();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.statValue, { color: colors.foreground }]} testID={testID}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, width: '100%', maxWidth: 560, alignSelf: 'center' },
  number: { fontSize: 15, fontWeight: '800' },
  prompt: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 14 },
  done: { fontSize: 15, textAlign: 'center', marginBottom: 12 },
  streakRow: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, paddingVertical: 12, marginBottom: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 13, marginTop: 2 },
  primary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16, minHeight: 52 },
  primaryText: { fontSize: 18, fontWeight: '700' },
  secondary: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, minHeight: 44 },
  secondaryText: { fontSize: 16, fontWeight: '700' },
  shareStatus: { textAlign: 'center', fontSize: 15, marginTop: 6 },
  countdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, padding: 12, marginTop: 16 },
  countdownText: { fontSize: 16, fontWeight: '700' },
  note: { fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 18 },
});
