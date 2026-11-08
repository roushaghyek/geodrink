import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { useTheme } from '../contexts/ThemeContext';
import { useSession } from '../contexts/SessionContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Colors } from '../constants/theme';
import { City } from '../data/cities';
import { loadSounds, playCorrectSound, playWrongSound, unloadSounds } from '../services/audio';
import { weatherClient } from '../services/weather';
import { withWeather } from '../engine/weather/client';
import { getBalancedRandomCities } from '../utils/city-selection';
import { celsiusToFahrenheit, fahrenheitToCelsius, getTempUnit, updateGameStats } from '../utils/storage';
import { evaluateTemperatureGuess, isCompleteTemperatureGuess, sanitizeTemperatureGuess, toggleMinusInGuess } from '../utils/temperature-guess';
import { parsePartyConfiguration } from '../utils/party-configuration';
import { getThemeStyles, toRgba } from '../utils/theme-colors';
import { gameStyles } from './game.styles';

interface CityData extends City {
  temperature: number;
}

export default function GameScreen() {
  const router = useRouter();
  const { startSession } = useSession();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const { mode, playerCount: playerCountParam, names: namesParam } = useLocalSearchParams<{ mode?: string, playerCount?: string | string[], names?: string | string[] }>();
  const partyConfiguration = parsePartyConfiguration(playerCountParam, namesParam);
  const hasValidPartyConfiguration = mode !== 'party' || partyConfiguration !== null;
  const [cityData, setCityData] = useState<CityData | null>(null);
  const [userGuess, setUserGuess] = useState('');
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<'playing' | 'revealed' | 'roundComplete'>('playing');
  // Party mode state
  const playerCount = partyConfiguration?.playerCount ?? 1;
  const playerNames = partyConfiguration?.names ?? ['Player 1'];
  const totalCities = mode === 'party' ? 10 * playerCount : 10;
  const [currentCityIndex, setCurrentCityIndex] = useState(1);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0); // 0-based
  const [playerScores, setPlayerScores] = useState<number[]>(Array(playerCount).fill(0));
  const [score, setScore] = useState({ correct: 0, incorrect: 0 }); // legacy/classic
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [lastGuessCorrect, setLastGuessCorrect] = useState<boolean | null>(null);
  const inputRef = useRef<TextInput>(null);
  const submitLockRef = useRef(false);
  const resultAnim = useRef(new Animated.Value(0)).current;

  const colors = isDark ? Colors.dark : Colors.light;
  const themeStyles = getThemeStyles(isDark);
  const styles = gameStyles;

  const [cityOrder, setCityOrder] = useState<CityData[]>([]); // Pre-generated unique cities

  useEffect(() => {
    startSession();
  }, [startSession]);

  const loadTempUnit = useCallback(async () => {
    const unit = await getTempUnit();
    setTempUnit(unit);
  }, []);

  const initGame = useCallback(async () => {
    await loadTempUnit();
    // Ask for a few spares so cities whose weather fails can be skipped.
    const uniqueCities = getBalancedRandomCities(totalCities + 4, playerCount);
    const { ok } = await withWeather(weatherClient, uniqueCities);
    const cities: CityData[] = ok
      .slice(0, totalCities)
      .map(({ city, weather }) => ({ ...city, temperature: Math.round(weather.tempC) }));
    setCityOrder(cities);
  }, [loadTempUnit, playerCount, totalCities]);

  useEffect(() => {
    if (!hasValidPartyConfiguration) {
      router.replace('/party-setup');
      return;
    }

    const runInit = async () => {
      await initGame();
    };
    runInit();
    loadSounds();
    return () => {
      unloadSounds();
    };
  }, [hasValidPartyConfiguration, initGame, router]);

  // Load the first city once cityOrder is populated
  useEffect(() => {
    if (cityOrder.length > 0 && !cityData && currentCityIndex === 1 && gameState === 'playing') {
      const firstCity = cityOrder[0];
      setCityData(firstCity);
      setLoading(false);
    }
  }, [cityOrder, cityData, currentCityIndex, gameState]);

  useEffect(() => {
    if (gameState !== 'revealed') {
      resultAnim.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.timing(resultAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(resultAnim, {
        toValue: 0.92,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.spring(resultAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [gameState, resultAnim]);

  const loadNewCity = async (cityIndex?: number) => {
    const indexToUse = cityIndex !== undefined ? cityIndex : currentCityIndex;
    if (indexToUse > totalCities) {
      setGameState('roundComplete');
      return;
    }
    setCityData(cityOrder[indexToUse - 1]);
    setGameState('playing');
    setLastGuessCorrect(null);
    submitLockRef.current = false;
    setUserGuess('');
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!isCompleteTemperatureGuess(userGuess) || !cityData || gameState !== 'playing' || submitLockRef.current) return;

    submitLockRef.current = true;
    Keyboard.dismiss();

    const guess = parseFloat(userGuess);
    if (isNaN(guess)) {
      submitLockRef.current = false;
      Alert.alert(t('invalidInputTitle'), t('invalidInputMessage'));
      return;
    }

    const actualTempCelsius = cityData.temperature;
    const { differenceCelsius, isCorrect } = evaluateTemperatureGuess(guess, actualTempCelsius, tempUnit);

    setLastGuessCorrect(isCorrect);

    if (mode === 'party') {
      // Update current player's score
      setPlayerScores(prev => {
        const updated = [...prev];
        if (isCorrect) updated[currentPlayerIndex] += 1;
        return updated;
      });
      if (isCorrect) playCorrectSound(); else playWrongSound();
    } else {
      // Classic mode
      if (isCorrect) {
        setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
        playCorrectSound();
      } else {
        setScore(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
        playWrongSound();
      }
      await updateGameStats(differenceCelsius, 0);
    }

    // Always show result first, regardless of whether it's the last city
    setGameState('revealed');
  };

  const handleNextCity = () => {
    if (mode === 'party') {
      // Advance to next player/city
      if (currentCityIndex < totalCities) {
        const nextIndex = currentCityIndex + 1;
        setCurrentCityIndex(nextIndex);
        setCurrentPlayerIndex((prev) => (prev + 1) % playerCount);
        loadNewCity(nextIndex);
      } else {
        setCurrentCityIndex(prev => prev + 1);
        setGameState('roundComplete');
      }
    } else {
      // Classic mode
      if (currentCityIndex < totalCities) {
        const nextIndex = currentCityIndex + 1;
        setCurrentCityIndex(nextIndex);
        loadNewCity(nextIndex);
      } else {
        setGameState('roundComplete');
      }
    }
  };

  const handleExitToHome = () => {
    router.push('/');
  };

  const getResultMessage = () => {
    if (!cityData || !userGuess) return '';
    
    const guess = parseFloat(userGuess);
    const actualTempCelsius = cityData.temperature;
    const guessTempCelsius = tempUnit === 'F' ? fahrenheitToCelsius(guess) : guess;
    const differenceCelsius = Math.abs(guessTempCelsius - actualTempCelsius);
    
    const actualTempDisplay = tempUnit === 'F' ? Math.round(celsiusToFahrenheit(actualTempCelsius)) : actualTempCelsius;
    const differenceDisplay = Math.abs(guess - actualTempDisplay);
    
    const threshold = tempUnit === 'F' ? (6 * 5/9) : 2;
    const isCorrect = differenceCelsius <= threshold;

    if (mode === 'party') {
      if (isCorrect) {
        return t('withinParty', { threshold: tempUnit === 'F' ? '6°F' : '2°C' });
      } else {
        return t('outsideParty', { threshold: tempUnit === 'F' ? '6°F' : '2°C' });
      }
    } else {
      if (isCorrect) {
        return t('correctWithin', { threshold: tempUnit === 'F' ? '6°F' : '2°C' });
      } else {
        return t('wrongBy', { difference: Math.round(differenceDisplay), unit: tempUnit });
      }
    }
  };

  const cleanGuessInput = (text: string) => {
    setUserGuess(sanitizeTemperatureGuess(text));
  };

  const toggleMinus = () => {
    setUserGuess(toggleMinusInGuess);
    inputRef.current?.focus();
  };

  // Show current player in party mode
  const currentPlayerName = mode === 'party' ? playerNames[currentPlayerIndex] : undefined;

  if (!hasValidPartyConfiguration || (loading && !cityData)) {
    const colors = isDark ? Colors.dark : Colors.light;
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={styles.loadingText}>{t('loadingCity')}</ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (gameState === 'roundComplete') {
    const themeStyles = getThemeStyles(isDark);
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.completeContainer}>
              <Ionicons name="trophy" size={80} color={colors.chart2} />
              <Text style={[styles.largeTitle, { color: colors.foreground }]}>{t('roundComplete')}</Text>
              <View style={[styles.finalScoreCard, { backgroundColor: themeStyles.primaryBackgroundLight }]}>
                <Text style={[styles.mediumText, { color: colors.foreground }]}>{t('finalScore')}</Text>
                {mode === 'party' ? (
                  <View style={styles.scoreRow}>
                    {playerNames.map((name, idx) => (
                      <View key={`${name}-${idx}`} style={styles.scoreColumn}>
                        <Text
                          style={[styles.smallText, styles.scoreName, { color: colors.mutedForeground, fontWeight: '700' }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {name}
                        </Text>
                        <Text style={[styles.largeNumber, { color: colors.secondary }]}>{playerScores[idx]}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.scoreRow}>
                    <View style={styles.scoreColumn}>
                      <Ionicons name="checkmark-circle" size={40} color={colors.chart3} />
                      <Text style={[styles.largeNumber, { color: colors.chart3 }]}>{score.correct}</Text>
                      <Text style={[styles.smallText, { color: colors.mutedForeground }]}>{t('correct')}</Text>
                    </View>
                    <View style={styles.scoreColumn}>
                      <Ionicons name="close-circle" size={40} color={colors.destructive} />
                      <Text style={[styles.largeNumber, { color: colors.destructive }]}>{score.incorrect}</Text>
                      <Text style={[styles.smallText, { color: colors.mutedForeground }]}>{t('wrong')}</Text>
                    </View>
                  </View>
                )}
                {mode === 'party' ? null : (
                  <Text style={[styles.accuracyText, { color: colors.foreground }]}> 
                    {t('accuracy')}: {Math.round((score.correct / totalCities) * 100)}%
                  </Text>
                )}
              </View>
              <Pressable
                style={styles.secondaryButton}
                onPress={handleExitToHome}
                accessibilityRole="button"
                accessibilityLabel={t('exitToHome')}
              >
                <Ionicons name="home" size={24} color={colors.primary} />
                <Text style={[styles.buttonText, { color: colors.primary }]}>{t('exitToHome')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentInsetAdjustmentBehavior="automatic"
          >
          {/* Header */}
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('back')}>
              <Ionicons name="arrow-back" size={28} color={isDark ? Colors.dark.primary : Colors.light.primary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}> 
              {mode === 'party' ? t('partyMode') : t('classicMode')}
            </Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Show current player in party mode */}
          {mode === 'party' && (
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.secondary }}>
                {t('currentPlayerTurn', { name: currentPlayerName || '' })}
              </Text>
              <Text style={{ fontSize: 15, color: '#888', marginTop: 2 }}>
                ({currentCityIndex} / {totalCities})
              </Text>
            </View>
          )}

          {/* City Card */}
          {cityData && (
            <View style={[styles.cityCard, { backgroundColor: toRgba(colors.primary, 0.05) }]}>
              <Ionicons name="location" size={50} color={colors.primary} />
              <Text style={[styles.cityTitle, { color: colors.foreground }]}> 
                {cityData.city}
              </Text>
              <Text style={[styles.countryText, { color: colors.mutedForeground }]}> 
                {cityData.country}
              </Text>
            </View>
          )}

          {/* Question */}
          <View style={styles.questionSection}>
            <Text style={[styles.questionText, { color: colors.foreground }]}> 
              {t('currentTemperatureQuestion')}
            </Text>
            {/* No timer or bonus UI */}
          </View>

          {/* Input or Result */}
          {gameState === 'playing' ? (
            <View style={styles.inputSection}>
              <View style={styles.inputRow}>
                <Pressable
                  style={[
                    styles.minusButton,
                    userGuess.startsWith('-') && styles.minusButtonActive,
                    {
                      backgroundColor: userGuess.startsWith('-') ? toRgba(colors.primary, 0.14) : toRgba(colors.muted, 0.5),
                      borderColor: userGuess.startsWith('-') ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={toggleMinus}
                  testID="minus-button"
                  accessibilityRole="button"
                  accessibilityLabel={userGuess.startsWith('-') ? t('removeMinus') : t('addMinus')}
                >
                  <Text style={[styles.minusButtonText, { color: colors.foreground }]}>+/-</Text>
                </Pressable>
                <TextInput
                  ref={inputRef}
                  style={[styles.temperatureInput, { color: colors.foreground, borderBottomColor: colors.primary }]}
                  value={userGuess}
                  onChangeText={cleanGuessInput}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
                  placeholder="--"
                  placeholderTextColor={colors.mutedForeground}
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={handleSubmit}
                  testID="temperature-input"
                  accessibilityLabel={t('currentTemperatureQuestion')}
                />
                <Text style={[styles.unitText, { color: colors.mutedForeground }]}> 
                  °{tempUnit}
                </Text>
              </View>

              {/* Submit button moved here so it's always visible */}
              <Pressable
                style={[styles.submitButton, !isCompleteTemperatureGuess(userGuess) && styles.disabledButton, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={!isCompleteTemperatureGuess(userGuess)}
                testID="submit-guess-button"
                accessibilityRole="button"
                accessibilityLabel={t('submitGuess')}
              >
                <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>{t('submitGuess')}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.resultSection}>
              <Animated.View
                style={[
                  styles.resultBadge,
                  {
                    backgroundColor: toRgba(lastGuessCorrect ? colors.chart3 : colors.destructive, 0.14),
                    transform: [
                      {
                        scale: resultAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.7, 1],
                        }),
                      },
                    ],
                    opacity: resultAnim,
                  },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                <Ionicons
                  name={lastGuessCorrect ? 'checkmark-circle' : 'close-circle'}
                  size={58}
                  color={lastGuessCorrect ? colors.chart3 : colors.destructive}
                />
              </Animated.View>
              <Text style={[styles.resultText, { color: colors.foreground }]}> 
                {getResultMessage()}
              </Text>
              <View style={styles.comparisonCard}>
                <View style={styles.comparisonItem}>
                  <Text style={[styles.smallText, { color: colors.mutedForeground }]}>{t('yourGuess')}</Text>
                  <Text style={[styles.tempNumber, { color: colors.foreground }]}>
                    {userGuess}°{tempUnit}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={28} color={colors.primary} />
                <View style={styles.comparisonItem}>
                  <Text style={[styles.smallText, { color: colors.mutedForeground }]}>{t('actual')}</Text>
                  <Text style={[styles.tempNumber, { color: colors.foreground }]}>
                    {tempUnit === 'C' 
                      ? cityData?.temperature 
                      : Math.round(celsiusToFahrenheit(cityData?.temperature || 0))}°{tempUnit}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Button - only for non-playing states */}
          {gameState !== 'playing' && (
            (
              <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleNextCity}
                testID="next-city-button"
                accessibilityRole="button"
                accessibilityLabel={mode === 'classic' && currentCityIndex >= totalCities ? t('viewResults') : t('nextCity')}
              >
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                  {mode === 'classic' && currentCityIndex >= totalCities
                    ? t('viewResults')
                    : mode === 'classic' && currentCityIndex < totalCities
                    ? t('nextCityProgress', { current: currentCityIndex, total: totalCities })
                    : t('nextCity')}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
              </Pressable>
            )
          )}

          {/* Score at Bottom */}
          <View style={[styles.scoreCard, { backgroundColor: themeStyles.mutedBackground }]}>
            {mode === 'party' ? (
              playerNames.map((name, idx) => (
                <View key={`${name}-${idx}`} style={styles.scoreItem}>
                  <Text
                    style={[styles.smallText, styles.scoreName, { color: isDark ? '#AAA' : '#666' }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {name}
                  </Text>
                  <Text style={[styles.scoreNumber, { color: colors.primary }]}>{playerScores[idx]}</Text>
                </View>
              ))
            ) : (
              <>
                <View style={styles.scoreItem}>
                  <Text style={[styles.smallText, { color: isDark ? '#AAA' : '#666' }]}>{t('correct')}</Text>
                  <Text style={[styles.scoreNumber, { color: colors.primary }]}>{score.correct}</Text>
                </View>
                <View style={styles.scoreItem}>
                  <Text style={[styles.smallText, { color: isDark ? '#AAA' : '#666' }]}>{t('wrong')}</Text>
                  <Text style={styles.scoreNumber}>{score.incorrect}</Text>
                </View>
                {mode === 'classic' && (
                  <View style={styles.scoreItem}>
                    <Text style={[styles.smallText, { color: isDark ? '#AAA' : '#666' }]}>{t('progress')}</Text>
                    <Text style={styles.scoreNumber}>{currentCityIndex}/{totalCities}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
