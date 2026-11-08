import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../components/themed-text";
import { ThemedView } from "../components/themed-view";
import { getRandomFunFact } from "../data/funFacts";
import { S } from "../styles";
import { Colors } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import { useLanguage } from "../contexts/LanguageContext";
const styles = S.home;

export default function HomeScreen() {
  const { hasSession, isLoadingSession, startSession } = useSession();

  if (isLoadingSession) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingStateContainer}>
            <ActivityIndicator size="large" />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!hasSession) {
    return <LandingView onStart={startSession} />;
  }

  return <GameHomeView />;
}

function LandingView({ onStart }: { onStart: () => Promise<void> }) {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.landingContainer}>
          <ThemedText style={[styles.landingTitle, { color: colors.foreground }]}>
            Weathr
          </ThemedText>
          <ThemedText style={[styles.landingSubtitle, { color: colors.mutedForeground }]}>
            {t('landingSubtitle')}
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.modeButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary, width: '100%' },
              pressed && styles.buttonPressed,
            ]}
            onPress={onStart}
            testID="enter-app-button"
            accessibilityRole="button"
            accessibilityLabel={t('enterApp')}
          >
            <ThemedText style={[styles.modeButtonText, { color: colors.primaryForeground }]}>
              {t('enterApp')}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function GameHomeView() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const colors = isDark ? Colors.dark : Colors.light;
  const [funFact, setFunFact] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      // Load a new fun fact each time the screen comes into focus
      setFunFact(getRandomFunFact());
    }, [])
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.headerBar}>
          <ThemedText style={styles.versionText}>v1.0</ThemedText>
          <Pressable
            style={({ pressed }) => [styles.settingsButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel={t('settings')}
          >
            <Ionicons name="settings-outline" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <ThemedText style={[styles.title, { color: colors.foreground }]}>
              Weathr
            </ThemedText>
          </View>

          {/* Weather/Location Widget */}
          <View style={[styles.weatherCard, { backgroundColor: colors.card, borderColor: colors.accent }]}>
            <View style={styles.weatherLeft}>
              <View style={[styles.weatherIcon, { backgroundColor: `${colors.accent}33` }]}>
                <Ionicons name="location-outline" size={24} color={colors.accent} />
              </View>
              <View>
                <ThemedText style={[styles.weatherSmallText, { color: colors.mutedForeground }]}>
                  {t('currentLocation')}
                </ThemedText>
                <ThemedText style={[styles.weatherLocationText, { color: colors.foreground }]}>
                  {t('autoDetected')}
                </ThemedText>
              </View>
            </View>
            <View style={styles.weatherRight}>
              <Ionicons name="thermometer-outline" size={20} color={colors.accent} />
              <ThemedText style={[styles.weatherTemp, { color: colors.foreground }]}>--°</ThemedText>
            </View>
          </View>


          {/* Mode Buttons */}
          <View style={styles.modesContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.modeButton,
                { backgroundColor: colors.primary, shadowColor: colors.primary },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/game?mode=classic')}
              testID="classic-mode-button"
              accessibilityRole="button"
              accessibilityLabel={t('classicMode')}
            >
              <ThemedText style={[styles.modeButtonText, { color: colors.primaryForeground }]}>
                {t('classicMode')}
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.modeButton,
                { backgroundColor: colors.chart5, shadowColor: colors.chart5 },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/hot-or-cold?mode=classic' as never)}
              testID="hot-or-cold-button"
              accessibilityRole="button"
              accessibilityLabel={t('hotOrCold')}
            >
              <Ionicons name="thermometer" size={20} color={colors.primaryForeground} />
              <ThemedText style={[styles.modeButtonText, { color: colors.primaryForeground }]}>
                {t('hotOrCold')}
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.modeButton,
                { backgroundColor: colors.secondary, shadowColor: colors.secondary },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/party-setup')}
              testID="party-mode-button"
              accessibilityRole="button"
              accessibilityLabel={t('partyMode')}
            >
              <Ionicons name="people" size={20} color={colors.secondaryForeground} />
              <ThemedText style={[styles.modeButtonText, { color: colors.secondaryForeground }]}>
                {t('partyMode')}
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.modeButton,
                { backgroundColor: colors.accent, shadowColor: colors.accent },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/online-party' as never)}
              testID="online-party-button"
              accessibilityRole="button"
              accessibilityLabel={t('onlineParty')}
            >
              <Ionicons name="wifi" size={20} color={colors.accentForeground} />
              <ThemedText style={[styles.modeButtonText, { color: colors.accentForeground }]}>
                {t('onlineParty')}
              </ThemedText>
            </Pressable>
          </View>

          {/* Utility Buttons Grid */}
          <View style={styles.utilityButtonsGrid}>
            <Pressable
              style={({ pressed }) => [
                styles.utilityButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/rules')}
              accessibilityRole="button"
              accessibilityLabel={t('rulesHelp')}
            >
              <Ionicons name="book-outline" size={20} color={colors.accent} />
              <ThemedText style={[styles.utilityButtonText, { color: colors.foreground }]}>
                {t('rulesHelp')}
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.utilityButton,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel={t('settings')}
            >
              <Ionicons name="settings-outline" size={20} color={colors.accent} />
              <ThemedText style={[styles.utilityButtonText, { color: colors.foreground }]}>
                {t('settings')}
              </ThemedText>
            </Pressable>
          </View>

          {/* Fun Fact Card */}
          <View style={[styles.funFactContainer, { backgroundColor: colors.card, borderLeftColor: colors.primary }]}>
            <ThemedText style={[styles.funFactLabel, { color: colors.primary }]}>{t('funFact')}</ThemedText>
            <ThemedText style={[styles.funFact, { color: colors.cardForeground }]}>{funFact}</ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
