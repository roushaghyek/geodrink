import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { ComponentProps, useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "../components/themed-text";
import { ThemedView } from "../components/themed-view";
import { getRandomFunFact } from "../data/funFacts";
import { S } from "../styles";
import { Colors } from "../constants/theme";
import { useTheme } from "../contexts/ThemeContext";
import { useSession } from "../contexts/SessionContext";
import { useLanguage } from "../contexts/LanguageContext";
import { ModeCard } from "../components/game/ModeCard";
import { Scrooby } from "../components/game/Scrooby";
import { DemoWeatherBadge } from "../components/game/WeatherNotice";
import { usePalette } from "../hooks/use-palette";
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
          <Scrooby mood="hello" size={110} />
          <ThemedText style={[styles.landingTitle, { color: colors.brand }]}>
            Weathr
          </ThemedText>
          <ThemedText style={[styles.landingSubtitle, { color: colors.mutedForeground }]}>
            {t('landingSubtitle')}
          </ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.modeButton,
              { backgroundColor: colors.brand, shadowColor: colors.brand, width: '100%' },
              pressed && styles.buttonPressed,
            ]}
            onPress={onStart}
            testID="enter-app-button"
            accessibilityRole="button"
            accessibilityLabel={t('enterApp')}
          >
            <ThemedText style={[styles.modeButtonText, { color: colors.brandForeground }]}>
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
  const colors = usePalette();
  const { t } = useLanguage();
  const [funFact, setFunFact] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      // A new fun fact each time the screen comes into focus
      setFunFact(getRandomFunFact());
    }, [])
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={home.scroll}>
          <View style={home.header}>
            <Text style={[home.wordmark, { color: colors.brand }]} accessibilityRole="header">
              Weathr
            </Text>
            <Pressable
              style={home.iconButton}
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel={t('settings')}
            >
              <Ionicons name="settings-outline" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={home.hero}>
            <Scrooby mood="hello" size={88} />
            <Text style={[home.greeting, { color: colors.foreground }]}>{t('homeGreeting')}</Text>
            <DemoWeatherBadge />
          </View>

          <View style={home.modes}>
            <ModeCard
              title={t('hotOrCold')}
              subtitle={t('hotColdCardSubtitle')}
              icon="swap-horizontal"
              onPress={() => router.push('/hot-or-cold' as never)}
              testID="hot-or-cold-button"
            />
            <ModeCard
              title={t('partyMode')}
              subtitle={t('partyCardSubtitle')}
              icon="people"
              onPress={() => router.push('/party-setup')}
              testID="party-mode-button"
            />
          </View>

          <Text style={[home.sectionLabel, { color: colors.mutedForeground }]}>{t('more')}</Text>
          <View style={home.links}>
            <HomeLink icon="school-outline" label={t('practice')} onPress={() => router.push('/practice' as never)} testID="practice-button" />
            <HomeLink icon="book-outline" label={t('rulesHelp')} onPress={() => router.push('/rules')} />
            <HomeLink icon="wifi" label={t('onlineParty')} onPress={() => router.push('/online-party' as never)} testID="online-party-button" />
          </View>

          {funFact ? (
            <View style={[home.funFact, { backgroundColor: colors.card, borderLeftColor: colors.brand }]}>
              <Text style={[home.funFactLabel, { color: colors.brand }]}>{t('funFact')}</Text>
              <Text style={[home.funFactText, { color: colors.cardForeground }]}>{funFact}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function HomeLink({ icon, label, onPress, testID }: { icon: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; testID?: string }) {
  const colors = usePalette();
  return (
    <Pressable
      style={({ pressed }) => [home.link, { backgroundColor: colors.card, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Ionicons name={icon} size={20} color={colors.brand} />
      <Text style={[home.linkText, { color: colors.foreground }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const home = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 32, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  wordmark: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 20 },
  greeting: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  modes: { gap: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginTop: 24, marginBottom: 10 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  link: { flexGrow: 1, flexBasis: '28%', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 6, minHeight: 72 },
  linkText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  funFact: { marginTop: 24, borderRadius: 14, borderLeftWidth: 4, padding: 16 },
  funFactLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  funFactText: { fontSize: 15, marginTop: 6, lineHeight: 21 },
});
