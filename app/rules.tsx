import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { useTheme } from '../contexts/ThemeContext';
import { Colors } from '../constants/theme';
import { S } from '../styles';

export default function RulesScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
          <ThemedText style={styles.title}>Rules & Help</ThemedText>
          <View style={styles.placeholder} />
        </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <RuleSection icon="speedometer" color={colors.brand} title="How scoring works">
          {[
            'Every guess is scored by how many degrees you were off the live temperature. Lower is better.',
            '🟩 within 1°C · 🟨 within 3°C · 🟧 within 6°C · 🟥 more than 6°C off',
            'Celsius by default. Switch to °F in Settings; scores are always compared fairly in °C.',
          ]}
        </RuleSection>

        <RuleSection icon="calendar" color={colors.brand} title="Weathr Daily">
          {[
            'Everyone in the world gets the same city each day. It changes at midnight UTC.',
            'You get one guess per day, scored against the live temperature when you guess.',
            'Share your result without spoiling the city, and keep your streak going.',
            'Because the temperature is live, a friend who plays hours later may face a slightly different number.',
          ]}
        </RuleSection>

        <RuleSection icon="swap-horizontal" color={colors.chart5} title="Hotter or Colder">
          {[
            'Two cities. Tap the one that is hotter right now.',
            'Get it right and the newer city stays while a fresh one joins.',
            'Same temperature? Free point. One wrong pick ends your run. Beat your best!',
          ]}
        </RuleSection>

        <RuleSection icon="people" color={colors.secondary} title="Party">
          {[
            '2 to 12 players, one phone. Everyone guesses the same city in private, then pass the phone.',
            'The reveal ranks everyone by degrees off. The furthest guess takes the penalty.',
            'Penalties scale with how far off you were (default: 1 point per 5°C, max 3 per round).',
            'The default penalty is a forfeit card: quick, silly and party-safe.',
            'Drinking rules are optional, for adults only (18+), and need a confirmation to switch on. Nobody has to drink, water counts, and you can skip any time. Never drink and drive.',
          ]}
        </RuleSection>

        <RuleSection icon="school" color={colors.accent} title="Practice">
          {['10 random cities, no pressure. A good warm-up for the Daily.']}
        </RuleSection>

        {/* Tips & Strategy */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={24} color={colors.chart5} />
            <ThemedText style={[styles.sectionTitle, { color: colors.chart5 }]}>
              Tips & Strategy
            </ThemedText>
          </View>
          <View style={styles.rulesList}>
            <ThemedText style={styles.rule}>
              🌍 Consider the hemisphere - is it summer or winter there?
            </ThemedText>
            <ThemedText style={styles.rule}>
              📍 Latitude matters - closer to equator = warmer
            </ThemedText>
            <ThemedText style={styles.rule}>
              🏔️ Altitude affects temperature (mountains are cooler)
            </ThemedText>
            <ThemedText style={styles.rule}>
              🌊 Coastal cities vs inland cities have different climates
            </ThemedText>
            <ThemedText style={styles.rule}>
              🕐 Time of day - remember different time zones!
            </ThemedText>
          </View>
        </View>

        {/* Temperature Reference */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="thermometer" size={24} color={colors.destructive} />
            <ThemedText style={[styles.sectionTitle, { color: colors.destructive }]}>
              Temperature Reference
            </ThemedText>
          </View>
          <View style={styles.referenceList}>
            <View style={styles.referenceItem}>
              <ThemedText style={styles.referenceTemp}>-20°C</ThemedText>
              <ThemedText style={styles.referenceDesc}>Arctic cold</ThemedText>
            </View>
            <View style={styles.referenceItem}>
              <ThemedText style={styles.referenceTemp}>0°C</ThemedText>
              <ThemedText style={styles.referenceDesc}>Freezing point</ThemedText>
            </View>
            <View style={styles.referenceItem}>
              <ThemedText style={styles.referenceTemp}>10°C</ThemedText>
              <ThemedText style={styles.referenceDesc}>Cool/Chilly</ThemedText>
            </View>
            <View style={styles.referenceItem}>
              <ThemedText style={styles.referenceTemp}>20°C</ThemedText>
              <ThemedText style={styles.referenceDesc}>Room temperature</ThemedText>
            </View>
            <View style={styles.referenceItem}>
              <ThemedText style={styles.referenceTemp}>30°C</ThemedText>
              <ThemedText style={styles.referenceDesc}>Hot summer day</ThemedText>
            </View>
            <View style={styles.referenceItem}>
              <ThemedText style={styles.referenceTemp}>40°C</ThemedText>
              <ThemedText style={styles.referenceDesc}>Extreme heat</ThemedText>
            </View>
          </View>
        </View>

        {/* About */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={24} color={colors.accent} />
            <ThemedText style={[styles.sectionTitle, { color: colors.accent }]}>
              About Weathr
            </ThemedText>
          </View>
          <ThemedText style={styles.paragraph}>
            Weathr combines geography with real-time weather data. Scrooby the hedgehog
            cheers you on (and sweats or shivers when you miss).
          </ThemedText>
          <ThemedText style={[styles.paragraph, { marginTop: 10 }]}>
            Temperature data is fetched in real-time, so the game is always current and
            challenging.
          </ThemedText>
        </View>
      </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = S.rules;

function RuleSection({ icon, color, title, children }: { icon: ComponentProps<typeof Ionicons>['name']; color: string; title: string; children: string[] }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <ThemedText style={[styles.sectionTitle, { color }]} accessibilityRole="header">
          {title}
        </ThemedText>
      </View>
      <View style={styles.rulesList}>
        {children.map(rule => (
          <ThemedText key={rule} style={styles.rule}>
            • {rule}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}
