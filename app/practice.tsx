import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CityCard } from '../components/game/CityCard';
import { ResultReveal } from '../components/game/ResultReveal';
import { ScreenHeader } from '../components/game/ScreenHeader';
import { Scrooby } from '../components/game/Scrooby';
import { TemperatureGuessInput } from '../components/game/TemperatureGuessInput';
import { DemoWeatherBadge, WeatherError } from '../components/game/WeatherNotice';
import { useLanguage } from '../contexts/LanguageContext';
import { useTempUnit } from '../contexts/TempUnitContext';
import { bandEmoji, evaluateGuess, formatDegreesOff, GuessEvaluation } from '../engine/scoring';
import { gameTemperature } from '../engine/weather/types';
import { usePalette } from '../hooks/use-palette';
import { useWeatherCities } from '../hooks/use-weather-cities';
import { loadSounds, playCorrectSound, playWrongSound, unloadSounds } from '../services/audio';
import { updateGameStats } from '../utils/storage';

const ROUNDS = 10;

/** Practice: the original single-player game on the shared engine. */
export default function PracticeScreen() {
  const router = useRouter();
  const colors = usePalette();
  const { t } = useLanguage();
  const { unit } = useTempUnit();
  const { status, rounds, reload } = useWeatherCities(ROUNDS);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [results, setResults] = useState<GuessEvaluation[]>([]);
  const [phase, setPhase] = useState<'guess' | 'reveal' | 'done'>('guess');

  useEffect(() => {
    loadSounds();
    return () => {
      unloadSounds();
    };
  }, []);

  const restart = () => {
    setIndex(0);
    setGuess('');
    setResults([]);
    setPhase('guess');
    reload();
  };

  if (status !== 'ready') {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.pad}>
          <ScreenHeader title={t('practice')} />
        </View>
        {status === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={[styles.muted, { color: colors.mutedForeground }]}>{t('loadingCity')}</Text>
          </View>
        ) : (
          <WeatherError onRetry={reload} />
        )}
      </SafeAreaView>
    );
  }

  const round = rounds[index];
  const actualC = gameTemperature(round.weather);
  const isLast = index >= rounds.length - 1;

  const submit = () => {
    const result = evaluateGuess(Number(guess), unit, actualC);
    setResults(previous => [...previous, result]);
    setPhase('reveal');
    if (result.offC <= 3) playCorrectSound();
    else playWrongSound();
    updateGameStats(result.offC, 0);
  };

  const next = () => {
    if (isLast) {
      setPhase('done');
      return;
    }
    setIndex(i => i + 1);
    setGuess('');
    setPhase('guess');
  };

  if (phase === 'done') {
    const average = results.reduce((sum, r) => sum + r.offC, 0) / Math.max(1, results.length);
    const best = Math.min(...results.map(r => r.offC));
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.pad}>
          <ScreenHeader title={t('practice')} />
          <View style={styles.summary} accessibilityLiveRegion="polite">
            <Scrooby mood={average <= 3 ? 'happy' : average <= 10 ? 'thinking' : 'sad'} size={120} />
            <Text style={[styles.big, { color: colors.foreground }]}>{t('roundComplete')}</Text>
            <Text style={[styles.bands, { color: colors.foreground }]} accessibilityLabel="Results by round">
              {results.map(r => bandEmoji(r.band)).join('')}
            </Text>
            <View style={styles.statRow}>
              <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t('averageOff')}</Text>
                <Text style={[styles.statValue, { color: colors.brand }]}>{formatDegreesOff(average, unit)}</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t('bestGuess')}</Text>
                <Text style={[styles.statValue, { color: colors.brand }]}>{formatDegreesOff(best, unit)}</Text>
              </View>
            </View>
            <Pressable style={[styles.primary, { backgroundColor: colors.brand }]} onPress={restart} accessibilityRole="button" testID="play-again-button">
              <Text style={[styles.primaryText, { color: colors.brandForeground }]}>{t('playAgain')}</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => router.replace('/')} accessibilityRole="button" testID="exit-home-button">
              <Ionicons name="home" size={20} color={colors.brand} />
              <Text style={[styles.secondaryText, { color: colors.brand }]}>{t('exitToHome')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            title={t('practice')}
            right={<Text style={[styles.progress, { color: colors.mutedForeground }]}>{index + 1}/{rounds.length}</Text>}
          />
          <DemoWeatherBadge />
          <CityCard city={round.city.city} country={round.city.country} />
          {phase === 'guess' ? (
            <>
              <Text style={[styles.question, { color: colors.foreground }]}>{t('currentTemperatureQuestion')}</Text>
              <TemperatureGuessInput
                value={guess}
                onChange={setGuess}
                onSubmit={submit}
                unit={unit}
                submitLabel={t('submitGuess')}
                inputLabel={t('currentTemperatureQuestion')}
              />
            </>
          ) : (
            <>
              <ResultReveal guessInUnit={Number(guess)} unit={unit} actualC={actualC} />
              <Pressable style={[styles.primary, { backgroundColor: colors.brand }]} onPress={next} accessibilityRole="button" testID="next-city-button">
                <Text style={[styles.primaryText, { color: colors.brandForeground }]}>
                  {isLast ? t('seeResults') : t('nextCityProgress', { current: index + 1, total: rounds.length })}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={colors.brandForeground} />
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { fontSize: 16 },
  progress: { fontSize: 15, fontWeight: '700' },
  question: { fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  primary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, minHeight: 52, alignSelf: 'stretch' },
  primaryText: { fontSize: 18, fontWeight: '700' },
  secondary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, minHeight: 48 },
  secondaryText: { fontSize: 17, fontWeight: '700' },
  summary: { alignItems: 'center', gap: 14 },
  big: { fontSize: 30, fontWeight: '800', textAlign: 'center' },
  bands: { fontSize: 24, letterSpacing: 2 },
  statRow: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  stat: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center' },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 26, fontWeight: '800', marginTop: 4 },
});
