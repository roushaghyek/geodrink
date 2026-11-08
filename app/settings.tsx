import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/themed-text';
import { ThemedView } from '../components/themed-view';
import { useTheme } from '../contexts/ThemeContext';
import { useSession } from '../contexts/SessionContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Colors } from '../constants/theme';
import { S } from '../styles';
import { LANGUAGE_OPTIONS } from '../utils/i18n';
import { useTempUnit } from '../contexts/TempUnitContext';
import { getJSON, getSoundEffectsEnabled, setJSON, setSoundEffectsEnabled, STORAGE_KEYS } from '../utils/storage';

export default function SettingsScreen() {
  const router = useRouter();
  const { endSession } = useSession();
  const { isDark, toggleDarkMode } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const colors = isDark ? Colors.dark : Colors.light;
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [onlinePartyEnabled, setOnlinePartyEnabled] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const { unit, setUnit } = useTempUnit();
  const celsiusEnabled = unit === 'C';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setSoundEnabled(await getSoundEffectsEnabled());
    setOnlinePartyEnabled(await getJSON<boolean>(STORAGE_KEYS.onlinePartyEnabled, false));
  };

  const toggleTempUnit = async (value: boolean) => {
    await setUnit(value ? 'C' : 'F');
  };

  const toggleOnlineParty = async (value: boolean) => {
    setOnlinePartyEnabled(value);
    await setJSON(STORAGE_KEYS.onlinePartyEnabled, value);
  };

  const toggleSoundEffects = async (value: boolean) => {
    setSoundEnabled(value);
    await setSoundEffectsEnabled(value);
  };

  const handleLogout = () => {
    Alert.alert(
      t('logoutConfirmTitle'),
      t('logoutConfirmMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            await endSession();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t('back')}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
          <ThemedText style={styles.title}>{t('settings')}</ThemedText>
          <View style={styles.placeholder} />
        </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Game Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('gameSettings')}</ThemedText>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="thermometer-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>{t('temperatureUnit')}</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {celsiusEnabled ? t('celsius') : t('fahrenheit')}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={celsiusEnabled}
              onValueChange={toggleTempUnit}
              trackColor={{ false: '#767577', true: colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="language-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>{t('language')}</ThemedText>
                <ThemedText style={styles.settingDescription}>{t('languageDescription')}</ThemedText>
                <View style={styles.languageGrid}>
                  {LANGUAGE_OPTIONS.map(option => {
                    const selected = option.code === language;
                    return (
                      <Pressable
                        key={option.code}
                        style={[
                          styles.languageButton,
                          {
                            backgroundColor: selected ? colors.primary : colors.background,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setLanguage(option.code)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${t('language')}: ${option.label}`}
                      >
                        <ThemedText
                          style={[
                            styles.languageButtonText,
                            { color: selected ? colors.primaryForeground : colors.foreground },
                          ]}
                        >
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Audio & Haptics */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('audioHaptics')}</ThemedText>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="volume-high-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>{t('soundEffects')}</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {t('soundEffectsDescription')}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={toggleSoundEffects}
              testID="sound-effects-switch"
              accessibilityLabel={t('soundEffects')}
              trackColor={{ false: '#767577', true: colors.primary }}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>{t('hapticFeedback')}</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {t('hapticFeedbackDescription')}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: '#767577', true: colors.primary }}
            />
          </View>
        </View>

        {/* Labs */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('labs')}</ThemedText>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="wifi" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>{t('onlineParty')}</ThemedText>
                <ThemedText style={styles.settingDescription}>{t('onlinePartyToggleDescription')}</ThemedText>
              </View>
            </View>
            <Switch
              value={onlinePartyEnabled}
              onValueChange={toggleOnlineParty}
              accessibilityLabel={t('onlineParty')}
              trackColor={{ false: '#767577', true: colors.primary }}
            />
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('appearance')}</ThemedText>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>{t('darkMode')}</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {t('darkModeDescription')}
                </ThemedText>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#767577', true: colors.primary }}
            />
          </View>
        </View>

        {/* Difficulty Settings */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('difficulty')}</ThemedText>
          
          <Pressable style={styles.optionItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="speedometer-outline" size={24} color={colors.chart3} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>{t('toleranceRange')}</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {t('toleranceCurrent')}
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.mutedForeground} />
          </Pressable>

          <Pressable style={styles.optionItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="globe-outline" size={24} color={colors.chart3} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>{t('citySelection')}</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {t('citySelectionDescription')}
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* About */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>{t('about')}</ThemedText>
          
          <Pressable style={styles.optionItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>{t('version')}</ThemedText>
                <ThemedText style={styles.settingDescription}>1.0.0</ThemedText>
              </View>
            </View>
          </Pressable>

          <Pressable style={styles.optionItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="heart-outline" size={24} color={colors.secondary} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>{t('rateApp')}</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {t('rateAppDescription')}
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.mutedForeground} />
          </Pressable>

          <Pressable style={styles.optionItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="share-social-outline" size={24} color={colors.primary} />
              <View style={styles.settingText}>
                <ThemedText style={styles.settingLabel}>{t('shareWithFriends')}</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {t('shareDescription')}
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={{ height: 40 }} />

        <View style={styles.section}>
          <Pressable
            style={[
              styles.optionItem,
              {
                borderWidth: 1,
                borderColor: colors.destructive,
                backgroundColor: `${colors.destructive}12`,
              },
            ]}
            onPress={handleLogout}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="log-out-outline" size={24} color={colors.destructive} />
              <View style={styles.settingText}>
                <ThemedText style={[styles.settingLabel, { color: colors.destructive }]}>{t('logout')}</ThemedText>
                <ThemedText style={styles.settingDescription}>
                  {t('logoutDescription')}
                </ThemedText>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = S.settings;
