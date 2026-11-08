import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/game/ScreenHeader';
import { Scrooby } from '../components/game/Scrooby';
import { DemoWeatherBadge, WeatherError } from '../components/game/WeatherNotice';
import { useLanguage } from '../contexts/LanguageContext';
import { useTempUnit } from '../contexts/TempUnitContext';
import { HotColdPair, hotterSide, isCorrectPick, nextPair, Side, updateHighScore } from '../engine/hot-or-cold';
import { formatTemp } from '../engine/scoring';
import { gameTemperature } from '../engine/weather/types';
import { useCityQueue } from '../hooks/use-city-queue';
import { useGoHome } from '../hooks/use-go-home';
import { usePalette } from '../hooks/use-palette';
import { loadSounds, playCorrectSound, playWrongSound, unloadSounds } from '../services/audio';
import { getJSON, setJSON, STORAGE_KEYS } from '../utils/storage';
import { toRgba } from '../utils/theme-colors';

type Phase = 'loading' | 'picking' | 'revealed' | 'over' | 'error';

/**
 * Endless Hotter or Colder: tap the hotter city; one miss ends the run.
 * Chain format: the newer city stays (temperature already known) and a
 * fresh one joins. See engine/hot-or-cold.ts.
 */
export default function HotOrColdScreen() {
  const goHome = useGoHome();
  const colors = usePalette();
  const { t } = useLanguage();
  const { unit } = useTempUnit();
  const { take } = useCityQueue();
  const [pair, setPair] = useState<HotColdPair | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [picked, setPicked] = useState<Side | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;

  const start = useCallback(async () => {
    setPhase('loading');
    setPicked(null);
    setScore(0);
    setIsNewBest(false);
    const left = await take();
    const right = left ? await take() : null;
    if (!left || !right) {
      setPhase('error');
      return;
    }
    setPair({ left, right });
    setPhase('picking');
  }, [take]);

  useEffect(() => {
    getJSON<number>(STORAGE_KEYS.hotColdBest, 0).then(setBest);
    loadSounds();
    start();
    return () => {
      unloadSounds();
    };
  }, [start]);

  useEffect(() => {
    if (phase !== 'revealed' && phase !== 'over') {
      reveal.setValue(0);
      return;
    }
    Animated.timing(reveal, { toValue: 1, duration: 280, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
  }, [phase, reveal]);

  const pick = (side: Side) => {
    if (!pair || phase !== 'picking') return;
    setPicked(side);
    if (isCorrectPick(pair, side)) {
      const nextScore = score + 1;
      setScore(nextScore);
      // Saved as you go, so leaving mid-run still records the best.
      if (nextScore > best) {
        setBest(nextScore);
        setIsNewBest(true);
        setJSON(STORAGE_KEYS.hotColdBest, updateHighScore(best, nextScore));
      }
      playCorrectSound();
      setPhase('revealed');
    } else {
      playWrongSound();
      setPhase('over');
    }
  };

  const next = async () => {
    if (!pair) return;
    setPhase('loading');
    const incoming = await take();
    if (!incoming) {
      setPhase('error');
      return;
    }
    setPair(nextPair(pair, incoming));
    setPicked(null);
    setPhase('picking');
  };

  const header = (
    <ScreenHeader
      title={t('hotOrCold')}
      right={
        <Text style={[styles.headerScore, { color: colors.mutedForeground }]} accessibilityLabel={`${t('bestStreak')}: ${best}`}>
          🏆 {best}
        </Text>
      }
    />
  );

  if (phase === 'error') {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.pad}>{header}</View>
        <WeatherError onRetry={pair ? next : start} />
      </SafeAreaView>
    );
  }

  if (!pair) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.pad}>{header}</View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={{ color: colors.mutedForeground }}>{t('loadingCity')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const answer = hotterSide(pair);
  const revealed = phase === 'revealed' || phase === 'over';
  const hotter = answer === null ? null : answer === 0 ? pair.left : pair.right;

  const message =
    phase === 'over'
      ? t('hotColdOver', { city: hotter?.city.city ?? '' })
      : answer === null
        ? t('hotColdTie')
        : t('hotColdCorrect', { city: hotter?.city.city ?? '' });

  const renderCity = (side: Side) => {
    const entry = side === 0 ? pair.left : pair.right;
    // In the chain, the left city was already revealed in the previous round.
    const carriedOver = side === 0 && score > 0;
    const knownTemp = revealed || carriedOver;
    const isWinner = revealed && (answer === null || answer === side);
    const isPicked = picked === side;
    const accent = revealed ? (isWinner ? colors.success : colors.mutedForeground) : colors.chart5;
    const longestWord = Math.max(...entry.city.city.split(/\s+/).map(word => word.length));
    const tempText = formatTemp(gameTemperature(entry.weather), unit);

    return (
      <Pressable
        key={side}
        onPress={() => pick(side)}
        disabled={phase !== 'picking'}
        testID={`hot-cold-option-${side}`}
        accessibilityRole="button"
        accessibilityLabel={`${entry.city.city}, ${entry.city.country}${knownTemp ? `, ${tempText}` : ''}`}
        accessibilityState={{ disabled: phase !== 'picking', selected: isPicked }}
        style={({ pressed }) => [
          styles.option,
          {
            backgroundColor: toRgba(accent, isWinner ? 0.16 : 0.06),
            borderColor: isPicked || isWinner ? accent : colors.border,
            borderWidth: isPicked ? 3 : 2,
          },
          pressed && phase === 'picking' && styles.pressed,
        ]}
      >
        <Ionicons name="location" size={30} color={revealed ? accent : colors.brand} />
        <Text
          style={[styles.city, { color: colors.foreground, fontSize: longestWord > 11 ? 15 : longestWord > 8 ? 18 : 22 }]}
          numberOfLines={2}
        >
          {entry.city.city}
        </Text>
        <Text style={[styles.country, { color: colors.mutedForeground }]} numberOfLines={1}>
          {entry.city.country}
        </Text>
        {knownTemp ? (
          <Animated.Text
            style={[
              styles.temp,
              { color: isWinner ? colors.success : colors.foreground },
              carriedOver ? null : { opacity: reveal, transform: [{ scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
            ]}
            testID={`hot-cold-temp-${side}`}
          >
            {tempText}
          </Animated.Text>
        ) : (
          <Text style={[styles.temp, { color: colors.mutedForeground }]}>?</Text>
        )}
        {revealed && isPicked ? (
          <Ionicons
            name={phase === 'over' ? 'close-circle' : 'checkmark-circle'}
            size={26}
            color={phase === 'over' ? colors.destructive : colors.success}
            style={styles.pickBadge}
          />
        ) : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.pad}>
        {header}
        <DemoWeatherBadge />
        <View style={styles.scoreRow} accessibilityLiveRegion="polite">
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>{t('score')}</Text>
          <Text style={[styles.scoreValue, { color: colors.brand }]} testID="hot-cold-score">
            {score}
          </Text>
        </View>

        <View style={[styles.question, { backgroundColor: toRgba(colors.chart5, 0.14) }]}>
          <Ionicons name="flame" size={24} color={colors.chart5} />
          <Text style={[styles.questionText, { color: colors.foreground }]}>{t('whichIsHotter')}</Text>
        </View>

        <View style={styles.options}>
          {renderCity(0)}
          <View style={[styles.vs, { backgroundColor: colors.foreground }]}>
            <Text style={[styles.vsText, { color: colors.background }]}>{t('versus')}</Text>
          </View>
          {renderCity(1)}
        </View>

        {phase === 'picking' ? <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t('tapToChoose')}</Text> : null}
        {phase === 'loading' ? <ActivityIndicator color={colors.brand} /> : null}

        {phase === 'revealed' ? (
          <>
            <Text style={[styles.message, { color: colors.foreground }]} testID="hot-cold-result" accessibilityLiveRegion="polite">
              {message}
            </Text>
            <Pressable style={[styles.primary, { backgroundColor: colors.brand }]} onPress={next} accessibilityRole="button" testID="hot-cold-next-button">
              <Text style={[styles.primaryText, { color: colors.brandForeground }]}>{t('nextCity2')}</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.brandForeground} />
            </Pressable>
          </>
        ) : null}

        {phase === 'over' ? (
          <View style={styles.over} accessibilityLiveRegion="polite">
            <Text style={[styles.message, { color: colors.foreground }]} testID="hot-cold-result">
              {message}
            </Text>
            <Scrooby mood={score >= 5 ? 'happy' : 'sad'} size={80} />
            <Text style={[styles.final, { color: colors.foreground }]} testID="hot-cold-final">
              {t('yourRun', { score })}
            </Text>
            {isNewBest ? <Text style={[styles.newBest, { color: colors.success }]}>🏆 {t('newBest')}</Text> : null}
            <Pressable style={[styles.primary, { backgroundColor: colors.brand }]} onPress={start} accessibilityRole="button" testID="play-again-button">
              <Text style={[styles.primaryText, { color: colors.brandForeground }]}>{t('playAgain')}</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={goHome} accessibilityRole="button" testID="hot-cold-exit-button">
              <Ionicons name="home" size={20} color={colors.brand} />
              <Text style={[styles.secondaryText, { color: colors.brand }]}>{t('exitToHome')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  headerScore: { fontSize: 15, fontWeight: '800' },
  scoreRow: { alignItems: 'center', marginBottom: 12 },
  scoreLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  scoreValue: { fontSize: 40, fontWeight: '900' },
  question: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 18 },
  questionText: { fontSize: 19, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  options: { flexDirection: 'row', alignItems: 'stretch', gap: 6, marginBottom: 18 },
  option: { flex: 1, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  pressed: { transform: [{ scale: 0.97 }] },
  city: { fontWeight: '800', textAlign: 'center', marginTop: 8 },
  country: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  temp: { fontSize: 30, fontWeight: '800', marginTop: 12 },
  pickBadge: { position: 'absolute', top: 10, right: 10 },
  vs: { alignSelf: 'center', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  vsText: { fontSize: 12, fontWeight: '900' },
  hint: { textAlign: 'center', fontSize: 15 },
  message: { textAlign: 'center', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  primary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16, minHeight: 52, alignSelf: 'stretch' },
  primaryText: { fontSize: 18, fontWeight: '700' },
  secondary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, minHeight: 48 },
  secondaryText: { fontSize: 17, fontWeight: '700' },
  over: { alignItems: 'center', gap: 10 },
  final: { fontSize: 26, fontWeight: '900' },
  newBest: { fontSize: 18, fontWeight: '800' },
});
