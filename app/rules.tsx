import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
        {/* Classic Mode */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={24} color={colors.primary} />
            <ThemedText style={styles.sectionTitle}>Classic Mode</ThemedText>
          </View>
          <ThemedText style={styles.paragraph}>
            Test your geography and weather knowledge at your own pace.
          </ThemedText>
          <View style={styles.rulesList}>
            <ThemedText style={styles.rule}>
              • The app shows you a random city from anywhere in the world
            </ThemedText>
            <ThemedText style={styles.rule}>
              • Guess the current temperature in Celsius
            </ThemedText>
            <ThemedText style={styles.rule}>
              • Get within 2°C to score a point
            </ThemedText>
            <ThemedText style={styles.rule}>
              • Track your accuracy over time
            </ThemedText>
          </View>
        </View>

        {/* Hotter or Colder */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="thermometer" size={24} color={colors.chart5} />
            <ThemedText style={[styles.sectionTitle, { color: colors.chart5 }]}>Hotter or Colder</ThemedText>
          </View>
          <ThemedText style={styles.paragraph}>
            Two cities, one question. No numbers to type.
          </ThemedText>
          <View style={styles.rulesList}>
            <ThemedText style={styles.rule}>
              • Each round shows two cities side by side
            </ThemedText>
            <ThemedText style={styles.rule}>
              • You&apos;re asked which one is hotter, or which one is colder, right now
            </ThemedText>
            <ThemedText style={styles.rule}>
              • Tap a city to lock in your pick and reveal both temperatures
            </ThemedText>
            <ThemedText style={styles.rule}>
              • A tie is a free point. With friends, each player gets their own pair of cities per turn
            </ThemedText>
          </View>
        </View>

        {/* Playing with friends */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={24} color={colors.secondary} />
            <ThemedText style={[styles.sectionTitle, { color: colors.secondary }]}>
              Playing with friends
            </ThemedText>
          </View>
          <ThemedText style={styles.paragraph}>
            A little extra for when you&apos;re playing with friends.
          </ThemedText>
          <View style={styles.rulesList}>
            <ThemedText style={styles.rule}>
              • Take turns guessing the temperature
            </ThemedText>
            <ThemedText style={styles.rule}>
              • Guess right? Everyone else drinks
            </ThemedText>
            <ThemedText style={styles.rule}>
              • Guess wrong? You drink
            </ThemedText>
            <ThemedText style={styles.rule}>
              • Pass the phone around the group
            </ThemedText>
          </View>
        </View>

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
            Weathr combines geography knowledge with real-time weather data to create
            a fun and educational game. Perfect for a quick challenge or a
            group game that tests your world geography skills!
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
