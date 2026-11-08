import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { Colors } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useSession } from '../contexts/SessionContext';
import { useTheme } from '../contexts/ThemeContext';
import { loadSounds, playCorrectSound, playWrongSound, unloadSounds } from '../services/audio';
import { getCurrentTemperature } from '../services/weather';
import { getBalancedRandomCities } from '../utils/city-selection';
import {
  buildHotColdMatchups,
  CityWithTemperature,
  getHotColdAnswer,
  getHotColdRoundCount,
  HotColdMatchup,
  HotColdSide,
  isCorrectHotColdPick,
} from '../utils/hot-or-cold';
import { parsePartyConfiguration } from '../utils/party-configuration';
import { celsiusToFahrenheit, getTempUnit } from '../utils/storage';
import { getThemeStyles, toRgba } from '../utils/theme-colors';
import { gameStyles } from './game.styles';

export default function HotOrColdScreen() {
  const router = useRouter();
  const { startSession } = useSession();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { mode: modeParam, playerCount: playerCountParam, names: namesParam } =
    useLocalSearchParams<{ mode?: string; playerCount?: string | string[]; names?: string | string[] }>();
  const mode: 'classic' | 'party' = modeParam === 'party' ? 'party' : 'classic';
  const partyConfiguration = parsePartyConfiguration(playerCountParam, namesParam);
  const hasValidPartyConfiguration = mode !== 'party' || partyConfiguration !== null;
  const playerCount = partyConfiguration?.playerCount ?? 1;
  const playerNames = partyConfiguration?.names ?? ['Player 1'];
  const totalRounds = getHotColdRoundCount(mode, playerCount);

  const [matchups, setMatchups] = useState<HotColdMatchup[]>([]);
  const [roundIndex, setRoundIndex] = useState(0); // 0-based
  const [picked, setPicked] = useState<HotColdSide | null>(null);
  const [gameState, setGameState] = useState<'playing' | 'revealed' | 'roundComplete'>('playing');
  const [playerScores, setPlayerScores] = useState<number[]>(() => Array(playerCount).fill(0));
  const [score, setScore] = useState({ correct: 0, incorrect: 0 });
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const resultAnim = useRef(new Animated.Value(0)).current;

  const colors = isDark ? Colors.dark : Colors.light;
  const themeStyles = getThemeStyles(isDark);
  const hotColor = colors.destructive;
  const coldColor = colors.primary;

  useEffect(() => {
    startSession();
  }, [startSession]);

  const initGame = useCallback(async () => {
    setTempUnit(await getTempUnit());
    const cities = getBalancedRandomCities(totalRounds * 2, Math.max(1, playerCount));
    const withTemps: CityWithTemperature[] = await Promise.all(
      cities.map(async city => ({
        ...city,
        temperature: Math.round(await getCurrentTemperature(city.lat, city.lon)),
      }))
    );
    setMatchups(buildHotColdMatchups(withTemps));
  }, [playerCount, totalRounds]);

  useEffect(() => {
    if (!hasValidPartyConfiguration) {
      router.replace('/party-setup');
      return;
    }
    initGame();
    loadSounds();
    return () => {
      unloadSounds();
    };
  }, [hasValidPartyConfiguration, initGame, router]);

  useEffect(() => {
    if (gameState !== 'revealed') {
      resultAnim.setValue(0);
      return;
    }
    Animated.timing(resultAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start();
  }, [gameState, resultAnim]);

  const matchup = matchups[roundIndex];
  const currentPlayerIndex = roundIndex % playerCount;
  const isLastRound = roundIndex >= matchups.length - 1;

  const formatTemp = (celsius: number) =>
    `${tempUnit === 'F' ? Math.round(celsiusToFahrenheit(celsius)) : celsius}°${tempUnit}`;

  const handlePick = (side: HotColdSide) => {
    if (!matchup || gameState !== 'playing') return;
    const correct = isCorrectHotColdPick(matchup, side);
    setPicked(side);
    if (mode === 'party') {
      setPlayerScores(prev => prev.map((s, i) => (i === currentPlayerIndex && correct ? s + 1 : s)));
    } else {
      setScore(prev => (correct ? { ...prev, correct: prev.correct + 1 } : { ...prev, incorrect: prev.incorrect + 1 }));
    }
    if (correct) playCorrectSound(); else playWrongSound();
    setGameState('revealed');
  };

  const handleNext = () => {
    if (isLastRound) {
      setGameState('roundComplete');
      return;
    }
    setRoundIndex(i => i + 1);
    setPicked(null);
    setGameState('playing');
  };

  if (!hasValidPartyConfiguration || !matchup) {
    return (
      <ThemedView style={gameStyles.container}>
        <SafeAreaView style={gameStyles.container} edges={['top']}>
          <View style={gameStyles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={gameStyles.loadingText}>{t('loadingCity')}</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (gameState === 'roundComplete') {
    const played = matchups.length;
    return (
      <ThemedView style={gameStyles.container}>
        <SafeAreaView style={gameStyles.container} edges={['top']}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={gameStyles.scrollContent}>
            <View style={gameStyles.completeContainer}>
              <Ionicons name="trophy" size={80} color={colors.chart2} />
              <Text style={[gameStyles.largeTitle, { color: colors.foreground }]}>{t('roundComplete')}</Text>
              <View style={[gameStyles.finalScoreCard, { backgroundColor: themeStyles.primaryBackgroundLight }]}>
                <Text style={[gameStyles.mediumText, { color: colors.foreground }]}>{t('finalScore')}</Text>
                {mode === 'party' ? (
                  <View style={gameStyles.scoreRow}>
                    {playerNames.map((name, idx) => (
                      <View key={`${name}-${idx}`} style={gameStyles.scoreColumn}>
                        <Text
                          style={[gameStyles.smallText, gameStyles.scoreName, { color: colors.mutedForeground, fontWeight: '700' }]}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                        <Text style={[gameStyles.largeNumber, { color: colors.secondary }]}>{playerScores[idx]}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <>
                    <View style={gameStyles.scoreRow}>
                      <View style={gameStyles.scoreColumn}>
                        <Ionicons name="checkmark-circle" size={40} color={colors.chart3} />
                        <Text style={[gameStyles.largeNumber, { color: colors.chart3 }]}>{score.correct}</Text>
                        <Text style={[gameStyles.smallText, { color: colors.mutedForeground }]}>{t('correct')}</Text>
                      </View>
                      <View style={gameStyles.scoreColumn}>
                        <Ionicons name="close-circle" size={40} color={colors.destructive} />
                        <Text style={[gameStyles.largeNumber, { color: colors.destructive }]}>{score.incorrect}</Text>
                        <Text style={[gameStyles.smallText, { color: colors.mutedForeground }]}>{t('wrong')}</Text>
                      </View>
                    </View>
                    <Text style={[gameStyles.accuracyText, { color: colors.foreground }]}>
                      {t('accuracy')}: {played ? Math.round((score.correct / played) * 100) : 0}%
                    </Text>
                  </>
                )}
              </View>
              <Pressable
                style={gameStyles.secondaryButton}
                onPress={() => router.push('/')}
                accessibilityRole="button"
                accessibilityLabel={t('exitToHome')}
                testID="hot-cold-exit-button"
              >
                <Ionicons name="home" size={24} color={colors.primary} />
                <Text style={[gameStyles.buttonText, { color: colors.primary }]}>{t('exitToHome')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isHotter = matchup.question === 'hotter';
  const questionColor = isHotter ? hotColor : coldColor;
  const answer = getHotColdAnswer(matchup);
  const lastPickCorrect = picked !== null && isCorrectHotColdPick(matchup, picked);

  const resultMessage = (() => {
    if (picked === null) return '';
    if (answer === null) return t('hotColdTie');
    if (mode === 'party') return lastPickCorrect ? t('hotColdPartyRight') : t('hotColdPartyWrong');
    return lastPickCorrect ? t('hotColdRight') : t('hotColdWrong');
  })();

  const renderCityOption = (side: HotColdSide) => {
    const city = matchup.cities[side];
    const revealed = gameState === 'revealed';
    const isWinner = revealed && (answer === null || answer === side);
    const isPicked = picked === side;
    const accent = revealed ? (isWinner ? colors.chart3 : colors.mutedForeground) : questionColor;

    return (
      <Pressable
        key={side}
        onPress={() => handlePick(side)}
        disabled={revealed}
        testID={`hot-cold-option-${side}`}
        accessibilityRole="button"
        accessibilityLabel={`${city.city}, ${city.country}`}
        accessibilityState={{ disabled: revealed, selected: isPicked }}
        style={({ pressed }) => [
          styles.option,
          {
            backgroundColor: toRgba(accent, revealed && isWinner ? 0.16 : 0.06),
            borderColor: isPicked || (revealed && isWinner) ? accent : colors.border,
            borderWidth: isPicked ? 3 : 2,
            opacity: revealed && !isWinner && !isPicked ? 0.7 : 1,
          },
          pressed && !revealed && styles.optionPressed,
        ]}
      >
        <Ionicons name="location" size={32} color={accent} />
        <Text
          style={[styles.optionCity, { color: colors.foreground, fontSize: cityFontSize(city.city) }]}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {city.city}
        </Text>
        <Text style={[styles.optionCountry, { color: colors.mutedForeground }]} numberOfLines={1}>
          {city.country}
        </Text>
        {revealed ? (
          <Animated.Text
            style={[
              styles.optionTemp,
              {
                color: isWinner ? colors.chart3 : colors.foreground,
                opacity: resultAnim,
                transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
              },
            ]}
          >
            {formatTemp(city.temperature)}
          </Animated.Text>
        ) : (
          <Text style={[styles.optionTemp, { color: colors.mutedForeground }]}>?</Text>
        )}
        {revealed && isPicked && (
          <Ionicons
            name={lastPickCorrect ? 'checkmark-circle' : 'close-circle'}
            size={28}
            color={lastPickCorrect ? colors.chart3 : colors.destructive}
            style={styles.pickBadge}
          />
        )}
      </Pressable>
    );
  };

  return (
    <ThemedView style={gameStyles.container}>
      <SafeAreaView style={gameStyles.container} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={gameStyles.scrollContent}>
          <View style={gameStyles.topBar}>
            <Pressable onPress={() => router.back()} style={gameStyles.backButton} accessibilityRole="button" accessibilityLabel={t('back')}>
              <Ionicons name="arrow-back" size={28} color={colors.primary} />
            </Pressable>
            <Text style={[gameStyles.headerTitle, { color: colors.foreground }]}>{t('hotOrCold')}</Text>
            <View style={{ width: 44 }} />
          </View>

          {mode === 'party' && (
            <View style={styles.turnBanner}>
              <Text style={[styles.turnText, { color: colors.secondary }]}>
                {t('currentPlayerTurn', { name: playerNames[currentPlayerIndex] })}
              </Text>
            </View>
          )}
          <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
            {roundIndex + 1} / {matchups.length}
          </Text>

          <View style={[styles.questionPill, { backgroundColor: toRgba(questionColor, 0.12) }]}>
            <Ionicons name={isHotter ? 'flame' : 'snow'} size={26} color={questionColor} />
            <Text style={[styles.questionText, { color: questionColor }]} testID="hot-cold-question">
              {isHotter ? t('whichIsHotter') : t('whichIsColder')}
            </Text>
          </View>

          <View style={styles.optionsRow}>
            {renderCityOption(0)}
            <View style={[styles.vsBadge, { backgroundColor: colors.foreground }]}>
              <Text style={[styles.vsText, { color: colors.background }]}>{t('versus')}</Text>
            </View>
            {renderCityOption(1)}
          </View>

          {gameState === 'playing' ? (
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>{t('tapToChoose')}</Text>
          ) : (
            <>
              <Text style={[gameStyles.resultText, { color: colors.foreground }]} testID="hot-cold-result">
                {resultMessage}
              </Text>
              <Pressable
                style={[gameStyles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleNext}
                testID="hot-cold-next-button"
                accessibilityRole="button"
                accessibilityLabel={isLastRound ? t('viewResults') : t('nextRound')}
              >
                <Text style={[gameStyles.buttonText, { color: colors.primaryForeground }]}>
                  {isLastRound
                    ? t('viewResults')
                    : t('nextRoundProgress', { current: roundIndex + 1, total: matchups.length })}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
              </Pressable>
            </>
          )}

          <View style={[gameStyles.scoreCard, { backgroundColor: themeStyles.mutedBackground }]}>
            {mode === 'party' ? (
              playerNames.map((name, idx) => (
                <View key={`${name}-${idx}`} style={gameStyles.scoreItem}>
                  <Text
                    style={[
                      gameStyles.smallText,
                      gameStyles.scoreName,
                      { color: idx === currentPlayerIndex ? colors.secondary : colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <Text style={[gameStyles.scoreNumber, { color: colors.primary }]}>{playerScores[idx]}</Text>
                </View>
              ))
            ) : (
              <>
                <View style={gameStyles.scoreItem}>
                  <Text style={[gameStyles.smallText, { color: colors.mutedForeground }]}>{t('correct')}</Text>
                  <Text style={[gameStyles.scoreNumber, { color: colors.primary }]}>{score.correct}</Text>
                </View>
                <View style={gameStyles.scoreItem}>
                  <Text style={[gameStyles.smallText, { color: colors.mutedForeground }]}>{t('wrong')}</Text>
                  <Text style={gameStyles.scoreNumber}>{score.incorrect}</Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// Shrink long single words (e.g. "Aguascalientes") so they don't break mid-word in a half-width card.
function cityFontSize(name: string): number {
  const longestWord = Math.max(...name.split(/\s+/).map(word => word.length));
  if (longestWord > 11) return 15;
  if (longestWord > 8) return 18;
  return 22;
}

const styles = StyleSheet.create({
  turnBanner: { alignItems: 'center', marginBottom: 4 },
  turnText: { fontSize: 20, fontWeight: '700' },
  progressText: { textAlign: 'center', fontSize: 15, marginBottom: 16 },
  questionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  questionText: { fontSize: 19, fontWeight: '800', flexShrink: 1, textAlign: 'center' },
  optionsRow: { flexDirection: 'row', alignItems: 'stretch', gap: 6, marginBottom: 20 },
  option: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 210,
  },
  optionPressed: { transform: [{ scale: 0.97 }] },
  optionCity: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  optionCountry: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  optionTemp: { fontSize: 30, fontWeight: '800', marginTop: 14 },
  pickBadge: { position: 'absolute', top: 10, right: 10 },
  vsBadge: {
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: { fontSize: 12, fontWeight: '900' },
  hintText: { textAlign: 'center', fontSize: 15, marginBottom: 20 },
});
