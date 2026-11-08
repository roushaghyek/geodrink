import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Colors } from '../constants/theme';

export default function PartySetupScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const colors = isDark ? Colors.dark : Colors.light;
  const [playerCount, setPlayerCount] = useState<number | null>(null);
  const [names, setNames] = useState<string[]>([]);

  // Step: 1 = select count, 2 = enter names
  const [step, setStep] = useState(1);

  const handleCountSelect = (count: number) => {
    setPlayerCount(count);
    setNames(Array(count).fill(''));
    setStep(2);
  };

  const handleNameChange = (idx: number, name: string) => {
    setNames(prev => {
      const updated = [...prev];
      updated[idx] = name;
      return updated;
    });
  };

  const handleStart = () => {
    if (names.some(n => !n.trim())) return;
    router.push({ pathname: '/game', params: { mode: 'party', playerCount: String(playerCount), names: JSON.stringify(names) } });
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setPlayerCount(null);
      setNames([]);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.topHeader}>
        <Pressable onPress={handleBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('back')}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('partySetup')}</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.iconHeader}>
          <Ionicons name="beer" size={40} color={colors.secondary} />
          <Text style={[styles.title, { color: colors.secondary }]}>{t('partyModeSetup')}</Text>
        </View>
        {step === 1 && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t('howManyPlayers')}</Text>
            <View style={styles.countContainer}>
              {[2,3,4,5,6,7,8].map(count => (
                <Pressable
                  key={count}
                  style={[styles.countButton, { backgroundColor: colors.secondary }]}
                  onPress={() => handleCountSelect(count)}
                  accessibilityRole="button"
                  accessibilityLabel={`${count}`}
                >
                  <Text style={[styles.countText, { color: colors.secondaryForeground }]}>{count}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        {step === 2 && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t('enterPlayerNames')}</Text>
            {names.map((name, idx) => (
              <TextInput
                key={idx}
                style={[styles.nameInput, { borderBottomColor: colors.secondary, color: colors.foreground }]}
                value={name}
                onChangeText={text => handleNameChange(idx, text)}
                placeholder={t('playerPlaceholder', { number: idx + 1 })}
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                accessibilityLabel={t('playerPlaceholder', { number: idx + 1 })}
              />
            ))}
            <Pressable
              style={[styles.startButton, { backgroundColor: colors.secondary }, names.some(n => !n.trim()) && styles.disabledButton]}
              onPress={handleStart}
              disabled={names.some(n => !n.trim())}
              accessibilityRole="button"
              accessibilityLabel={t('startGame')}
            >
              <Text style={[styles.startText, { color: colors.secondaryForeground }]}>{t('startGame')}</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.secondaryForeground} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollContent: { padding: 24, paddingTop: 16 },
  iconHeader: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  section: { marginBottom: 32 },
  label: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  countContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center', 
    gap: 12, 
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  countButton: { 
    borderRadius: 12, 
    paddingVertical: 16, 
    paddingHorizontal: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  countText: { fontSize: 20, fontWeight: '700' },
  nameInput: { fontSize: 18, borderBottomWidth: 2, marginBottom: 18, paddingVertical: 8, paddingHorizontal: 12 },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, marginTop: 18 },
  startText: { fontSize: 20, fontWeight: '700', marginRight: 8 },
  disabledButton: { opacity: 0.5 },
});
