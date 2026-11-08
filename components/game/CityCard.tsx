import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../hooks/use-palette';
import { toRgba } from '../../utils/theme-colors';

export function CityCard({ city, country, compact }: { city: string; country: string; compact?: boolean }) {
  const colors = usePalette();
  return (
    <View
      style={[styles.card, compact && styles.compact, { backgroundColor: toRgba(colors.brand, 0.07), borderColor: toRgba(colors.brand, 0.25) }]}
      accessible
      accessibilityLabel={`${city}, ${country}`}
      testID="city-card"
    >
      <Ionicons name="location" size={compact ? 28 : 40} color={colors.brand} />
      <Text style={[styles.city, compact && styles.cityCompact, { color: colors.foreground }]}>{city}</Text>
      <Text style={[styles.country, { color: colors.mutedForeground }]}>{country}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 18, width: '100%' },
  compact: { padding: 14 },
  city: { fontSize: 30, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  cityCompact: { fontSize: 24 },
  country: { fontSize: 17, marginTop: 4, textAlign: 'center' },
});
