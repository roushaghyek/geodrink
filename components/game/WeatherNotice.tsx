import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePalette } from '../../hooks/use-palette';
import { weatherSource } from '../../services/weather';
import { toRgba } from '../../utils/theme-colors';
import { Scrooby } from './Scrooby';

/** Small badge shown whenever temperatures are not live. */
export function DemoWeatherBadge() {
  const colors = usePalette();
  const { t } = useLanguage();
  if (weatherSource !== 'demo') return null;
  return (
    <View style={[styles.badge, { backgroundColor: toRgba(colors.chart5, 0.18) }]} accessibilityLabel={t('demoWeatherHint')}>
      <Ionicons name="flask-outline" size={14} color={colors.foreground} />
      <Text style={[styles.badgeText, { color: colors.foreground }]}>{t('demoWeather')}</Text>
    </View>
  );
}

/** Full-screen friendly error with a retry button. */
export function WeatherError({ onRetry }: { onRetry: () => void }) {
  const colors = usePalette();
  const { t } = useLanguage();
  return (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <Scrooby mood="sad" />
      <Text style={[styles.errorTitle, { color: colors.foreground }]}>{t('weatherUnavailableTitle')}</Text>
      <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>
        {weatherSource === 'unconfigured' ? t('weatherNotConfigured') : t('weatherUnavailableBody')}
      </Text>
      <Pressable
        style={[styles.retry, { backgroundColor: colors.brand }]}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t('tryAgain')}
        testID="weather-retry-button"
      >
        <Text style={[styles.retryText, { color: colors.brandForeground }]}>{t('tryAgain')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, marginBottom: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  errorTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  errorBody: { fontSize: 16, textAlign: 'center', maxWidth: 320 },
  retry: { marginTop: 12, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, minHeight: 48 },
  retryText: { fontSize: 18, fontWeight: '700' },
});
