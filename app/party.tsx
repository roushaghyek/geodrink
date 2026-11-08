import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CityCard } from '../components/game/CityCard';
import { ScreenHeader } from '../components/game/ScreenHeader';
import { Scrooby, ScroobyFace } from '../components/game/Scrooby';
import { TemperatureGuessInput } from '../components/game/TemperatureGuessInput';
import { DemoWeatherBadge, WeatherError } from '../components/game/WeatherNotice';
import { useLanguage } from '../contexts/LanguageContext';
import { FORFEITS } from '../data/forfeits';
import { createDeck } from '../engine/deck';
import { createPartyState, currentPlayer, parsePartyConfig, PartyConfig, partyReducer, standings } from '../engine/party';
import { evaluateGuess, formatDegreesOff, formatTemp } from '../engine/scoring';
import { useCityQueue } from '../hooks/use-city-queue';
import { useGoHome } from '../hooks/use-go-home';
import { usePalette } from '../hooks/use-palette';
import { loadSounds, playCorrectSound, unloadSounds } from '../services/audio';
import { toRgba } from '../utils/theme-colors';

/** Pass-the-phone Party (config comes from party-setup as a JSON param). */
export default function PartyScreen() {
  const { config: rawConfig } = useLocalSearchParams<{ config?: string }>();
  const config = useMemo(() => {
    try {
      return parsePartyConfig(JSON.parse(String(rawConfig ?? '')));
    } catch {
      return null;
    }
  }, [rawConfig]);
  const [gameKey, setGameKey] = useState(0);

  if (!config) return <Redirect href="/party-setup" />;
  return <PartyGame key={gameKey} config={config} onPlayAgain={() => setGameKey(k => k + 1)} />;
}

function PartyGame({ config, onPlayAgain }: { config: PartyConfig; onPlayAgain: () => void }) {
  const router = useRouter();
  const goHome = useGoHome();
  const colors = usePalette();
  const { t } = useLanguage();
  const [state, dispatch] = useReducer(partyReducer, config, createPartyState);
  const [guess, setGuess] = useState('');
  const { take } = useCityQueue(3, 2);
  const deck = useRef(createDeck(FORFEITS)).current;
  const playerCount = config.players.length;
  const unit = config.unit;

  useEffect(() => {
    loadSounds();
    return () => {
      unloadSounds();
    };
  }, []);

  // Fetch the round's city (prefetched in the background by the queue).
  useEffect(() => {
    if (state.phase !== 'loading') return;
    let cancelled = false;
    take().then(city => {
      if (cancelled) return;
      dispatch(city ? { type: 'cityReady', city } : { type: 'cityFailed' });
    });
    return () => {
      cancelled = true;
    };
  }, [state.phase, take]);

  useEffect(() => {
    if (state.phase === 'reveal') playCorrectSound();
  }, [state.phase]);

  const player = config.players[currentPlayer(state)];
  const headerRight = (
    <Text style={[styles.counter, { color: colors.mutedForeground }]}>
      {Math.min(state.round + 1, config.rounds)}/{config.rounds}
    </Text>
  );
  const shell = (children: React.ReactNode, scroll = true) => (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
            <ScreenHeader title={t('partyMode')} right={headerRight} />
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.pad, styles.screen]}>
            <ScreenHeader title={t('partyMode')} right={headerRight} />
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (state.phase === 'loading') {
    return shell(
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={{ color: colors.mutedForeground }}>{t('loadingCity')}</Text>
      </View>,
      false
    );
  }

  if (state.phase === 'error') {
    return shell(<WeatherError onRetry={() => dispatch({ type: 'retry' })} />, false);
  }

  if (state.phase === 'handoff') {
    // Full-screen hand-off: nothing from earlier guesses is on screen.
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.brand }]} edges={['top', 'bottom']}>
        <View style={styles.handoff} testID="handoff-screen">
          <Text style={[styles.handoffMeta, { color: toRgba(colors.brandForeground, 0.8) }]}>
            {t('roundOf', { current: state.round + 1, total: config.rounds })} · {t('playerOf', { current: state.turn + 1, total: playerCount })}
          </Text>
          <Scrooby mood="hello" size={110} onBrand />
          <Text style={[styles.handoffLabel, { color: colors.brandForeground }]}>{t('passPhoneTo')}</Text>
          <Text style={[styles.handoffName, { color: colors.brandForeground }]} accessibilityRole="header" testID="handoff-name">
            {player}
          </Text>
          <Text style={[styles.handoffHint, { color: toRgba(colors.brandForeground, 0.85) }]}>{t('noPeeking')}</Text>
          <Pressable
            style={[styles.handoffButton, { backgroundColor: colors.brandForeground }]}
            onPress={() => {
              setGuess('');
              dispatch({ type: 'startTurn' });
            }}
            accessibilityRole="button"
            testID="start-turn-button"
          >
            <Text style={[styles.handoffButtonText, { color: colors.brand }]}>{t('imReady', { name: player })}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (state.phase === 'guess' && state.city) {
    const isLast = state.turn === playerCount - 1;
    return shell(
      <>
        <DemoWeatherBadge />
        <CityCard city={state.city.city.city} country={state.city.city.country} />
        <Text style={[styles.prompt, { color: colors.foreground }]}>{t('guessPromptName', { name: player })}</Text>
        <TemperatureGuessInput
          value={guess}
          onChange={setGuess}
          onSubmit={() =>
            dispatch({
              type: 'submitGuess',
              guess: Number(guess),
              forfeit: isLast && config.penalty.mode === 'forfeits' ? deck.draw() : undefined,
            })
          }
          unit={unit}
          submitLabel={t('lockIn')}
          inputLabel={t('currentTemperatureQuestion')}
          autoFocus
        />
      </>
    );
  }

  if (state.phase === 'reveal') {
    const round = state.history[state.history.length - 1];
    const losers = round.ranked.filter(entry => entry.isFurthest);
    const loserNames = losers.map(entry => config.players[entry.playerIndex]).join(' & ');
    const points = losers[0]?.penalty ?? 0;
    const firstLoser = losers[0];
    const loserEvaluation = firstLoser ? evaluateGuess(round.guesses[firstLoser.playerIndex], unit, round.actualC) : null;
    const mood: ScroobyFace = loserEvaluation?.mood ?? 'happy';
    const direction = loserEvaluation?.direction === 1 ? t('tooHot') : t('tooCold');
    const isLastRound = state.round + 1 >= config.rounds;

    return shell(
      <>
        <CityCard city={round.city.city.city} country={round.city.city.country} compact />
        <View style={styles.actual} accessibilityLiveRegion="polite">
          <Text style={[styles.actualLabel, { color: colors.mutedForeground }]}>{t('liveTemperature')}</Text>
          <Text style={[styles.actualValue, { color: colors.brand }]} testID="party-actual">
            {formatTemp(round.actualC, unit)}
          </Text>
        </View>

        <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.card }]} testID="party-ranking">
          {round.ranked.map(entry => {
            const tint = entry.isFurthest ? colors.destructive : entry.rank === 1 ? colors.success : undefined;
            return (
              <View
                key={entry.playerIndex}
                style={[styles.rankRow, { borderBottomColor: colors.border }, tint ? { backgroundColor: toRgba(tint, 0.12) } : null]}
                accessible
                accessibilityLabel={`${entry.rank}. ${config.players[entry.playerIndex]}: ${round.guesses[entry.playerIndex]}°${unit}, ${formatDegreesOff(entry.offC, unit)} off`}
              >
                <Text style={[styles.rank, { color: colors.mutedForeground }]}>{entry.rank}</Text>
                <Text style={[styles.rankName, { color: colors.foreground }]} numberOfLines={1}>
                  {config.players[entry.playerIndex]}
                </Text>
                <Text style={[styles.rankGuess, { color: colors.foreground }]}>
                  {round.guesses[entry.playerIndex]}°{unit}
                </Text>
                <Text style={[styles.rankOff, { color: tint ?? colors.mutedForeground }]}>{t('degreesOff', { value: formatDegreesOff(entry.offC, unit) })}</Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.penaltyCard, { backgroundColor: toRgba(colors.chart5, 0.12), borderColor: colors.chart5 }]} testID="penalty-card">
          <Scrooby mood={mood} size={72} caption={firstLoser ? t('scroobyLoser', { name: loserNames, direction }) : undefined} />
          {losers.length === 0 ? (
            <Text style={[styles.penaltyTitle, { color: colors.foreground }]}>{t('noPenalty')}</Text>
          ) : config.penalty.mode === 'forfeits' ? (
            <>
              <Text style={[styles.penaltyTitle, { color: colors.foreground }]}>{t('takesForfeit', { names: loserNames })}</Text>
              <Text style={[styles.forfeit, { color: colors.foreground }]} testID="forfeit-text">
                “{round.forfeit}”
              </Text>
              <Text style={[styles.points, { color: colors.mutedForeground }]}>{points === 1 ? t('pointsThisRoundOne') : t('pointsThisRound', { count: points })}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.penaltyTitle, { color: colors.foreground }]} testID="sips-text">
                {points === 1 ? t('takeSipsOne', { names: loserNames }) : t('takeSips', { names: loserNames, count: points })}
              </Text>
              <Text style={[styles.points, { color: colors.mutedForeground }]}>{t('drinkResponsibly')}</Text>
            </>
          )}
        </View>

        <Pressable
          style={[styles.primary, { backgroundColor: colors.brand }]}
          onPress={() => dispatch({ type: 'nextRound' })}
          accessibilityRole="button"
          testID="party-next-button"
        >
          <Text style={[styles.primaryText, { color: colors.brandForeground }]}>{isLastRound ? t('seeFinal') : t('nextRound')}</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.brandForeground} />
        </Pressable>
      </>
    );
  }

  // Final standings
  const table = standings(state);
  const winnerRows = table.filter(row => row.rank === 1);
  const winners = winnerRows.map(row => row.name).join(' & ');
  return shell(
    <>
      <View style={styles.finalHero} accessibilityLiveRegion="polite">
        <Scrooby mood="happy" size={110} />
        <Text style={[styles.finalTitle, { color: colors.foreground }]} testID="party-winner">
          {t(winnerRows.length > 1 ? 'partyWinners' : 'partyWinner', { name: winners })}
        </Text>
        <Text style={[styles.actualLabel, { color: colors.mutedForeground }]}>{t('finalStandings')}</Text>
      </View>
      <View style={[styles.table, { borderColor: colors.border, backgroundColor: colors.card }]} testID="party-standings">
        {table.map(row => (
          <View
            key={row.playerIndex}
            style={[styles.rankRow, { borderBottomColor: colors.border }]}
            accessible
            accessibilityLabel={`${row.rank}. ${row.name}: ${t('totalOff', { value: formatDegreesOff(row.totalOffC, unit) })}, ${t('penaltyPoints')} ${row.penalties}`}
          >
            <Text style={[styles.rank, { color: colors.mutedForeground }]}>{row.rank === 1 ? '🏆' : row.rank}</Text>
            <Text style={[styles.rankName, { color: colors.foreground }]} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={[styles.rankOff, { color: colors.foreground }]}>{t('totalOff', { value: formatDegreesOff(row.totalOffC, unit) })}</Text>
            <Text style={[styles.rankPenalty, { color: colors.chart5 }]}>⚑ {row.penalties}</Text>
          </View>
        ))}
      </View>
      <Pressable style={[styles.primary, { backgroundColor: colors.brand }]} onPress={onPlayAgain} accessibilityRole="button" testID="party-again-button">
        <Text style={[styles.primaryText, { color: colors.brandForeground }]}>{t('samePlayersAgain')}</Text>
      </Pressable>
      <View style={styles.secondaryRow}>
        <Pressable
          style={styles.secondary}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/party-setup'))}
          accessibilityRole="button"
        >
          <Ionicons name="people" size={20} color={colors.brand} />
          <Text style={[styles.secondaryText, { color: colors.brand }]}>{t('editPlayers')}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={goHome} accessibilityRole="button">
          <Ionicons name="home" size={20} color={colors.brand} />
          <Text style={[styles.secondaryText, { color: colors.brand }]}>{t('exitToHome')}</Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pad: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  counter: { fontSize: 15, fontWeight: '800' },
  handoff: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  handoffMeta: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  handoffLabel: { fontSize: 20, fontWeight: '600', marginTop: 12 },
  handoffName: { fontSize: 40, fontWeight: '900', textAlign: 'center' },
  handoffHint: { fontSize: 15, textAlign: 'center' },
  handoffButton: { marginTop: 20, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, minHeight: 56, alignSelf: 'stretch', maxWidth: 420, alignItems: 'center', justifyContent: 'center' },
  handoffButtonText: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  prompt: { fontSize: 19, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  actual: { alignItems: 'center', marginBottom: 12 },
  actualLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  actualValue: { fontSize: 44, fontWeight: '900' },
  table: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 48 },
  rank: { width: 26, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  rankName: { flex: 1, fontSize: 17, fontWeight: '700' },
  rankGuess: { fontSize: 16, fontWeight: '600', minWidth: 52, textAlign: 'right' },
  rankOff: { fontSize: 15, fontWeight: '800', minWidth: 78, textAlign: 'right' },
  rankPenalty: { fontSize: 15, fontWeight: '800', minWidth: 36, textAlign: 'right' },
  penaltyCard: { borderWidth: 1.5, borderRadius: 18, padding: 16, alignItems: 'center', gap: 8, marginBottom: 16 },
  penaltyTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center' },
  forfeit: { fontSize: 18, fontStyle: 'italic', textAlign: 'center', lineHeight: 25 },
  points: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  primary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16, minHeight: 52 },
  primaryText: { fontSize: 18, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  secondary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, minHeight: 48 },
  secondaryText: { fontSize: 16, fontWeight: '700' },
  finalHero: { alignItems: 'center', gap: 10, marginBottom: 16 },
  finalTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
});
