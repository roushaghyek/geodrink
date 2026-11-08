import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { bandEmoji, bandLabel, evaluateGuess, formatDegreesOff, formatTemp, TempUnit } from '../../engine/scoring';
import { usePalette } from '../../hooks/use-palette';
import type { TranslationKey } from '../../utils/i18n';
import { toRgba } from '../../utils/theme-colors';
import { Scrooby } from './Scrooby';

const MOOD_CAPTIONS: Record<string, TranslationKey> = {
  happy: 'scroobyHappy',
  sweating: 'scroobySweating',
  shivering: 'scroobyShivering',
  sad: 'scroobySad',
};

interface Props {
  guessInUnit: number;
  unit: TempUnit;
  actualC: number;
  /** Optional line under the numbers, e.g. "Live temperature at 14:20 UTC". */
  footnote?: string;
}

/** Shared results panel: Scrooby's reaction, guess vs live temp, degrees off. */
export function ResultReveal({ guessInUnit, unit, actualC, footnote }: Props) {
  const colors = usePalette();
  const { t } = useLanguage();
  const result = evaluateGuess(guessInUnit, unit, actualC);
  const caption = t(MOOD_CAPTIONS[result.mood]);
  const offText = result.offC === 0 ? t('perfectGuess') : t('degreesOff', { value: formatDegreesOff(result.offC, unit) });

  return (
    <View style={styles.container} accessibilityLiveRegion="polite" testID="result-reveal">
      <Scrooby mood={result.mood} caption={caption} />
      <View style={[styles.offPill, { backgroundColor: toRgba(colors.brand, 0.1) }]}>
        <Text style={[styles.offText, { color: colors.foreground }]} testID="degrees-off">
          {bandEmoji(result.band)} {offText}
        </Text>
        <Text style={[styles.bandText, { color: colors.mutedForeground }]}>{bandLabel(result.band, unit)}</Text>
      </View>
      <View style={styles.compare}>
        <View style={styles.compareItem}>
          <Text style={[styles.compareLabel, { color: colors.mutedForeground }]}>{t('yourGuess')}</Text>
          <Text style={[styles.compareValue, { color: colors.foreground }]}>
            {guessInUnit}°{unit}
          </Text>
        </View>
        <Text style={[styles.arrow, { color: colors.brand }]} importantForAccessibility="no">
          →
        </Text>
        <View style={styles.compareItem}>
          <Text style={[styles.compareLabel, { color: colors.mutedForeground }]}>{t('actual')}</Text>
          <Text style={[styles.compareValue, { color: colors.foreground }]} testID="actual-temperature">
            {formatTemp(actualC, unit)}
          </Text>
        </View>
      </View>
      {footnote ? <Text style={[styles.footnote, { color: colors.mutedForeground }]}>{footnote}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 20, width: '100%' },
  offPill: { marginTop: 16, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 18, alignItems: 'center' },
  offText: { fontSize: 24, fontWeight: '800' },
  bandText: { fontSize: 14, marginTop: 2 },
  compare: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 16 },
  compareItem: { alignItems: 'center', minWidth: 96 },
  compareLabel: { fontSize: 14 },
  compareValue: { fontSize: 30, fontWeight: '800', marginTop: 2 },
  arrow: { fontSize: 26, fontWeight: '700' },
  footnote: { fontSize: 13, marginTop: 12, textAlign: 'center' },
});
