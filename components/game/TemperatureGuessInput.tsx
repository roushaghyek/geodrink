import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { isCompleteTemperatureGuess, sanitizeTemperatureGuess, toggleMinusInGuess } from '../../engine/guess-input';
import type { TempUnit } from '../../engine/scoring';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePalette } from '../../hooks/use-palette';
import { toRgba } from '../../utils/theme-colors';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  unit: TempUnit;
  submitLabel: string;
  inputLabel: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/** Number entry with a +/- toggle (mobile number pads often lack a minus key). */
export function TemperatureGuessInput({ value, onChange, onSubmit, unit, submitLabel, inputLabel, disabled, autoFocus }: Props) {
  const colors = usePalette();
  const { t } = useLanguage();
  const inputRef = useRef<TextInput>(null);
  const negative = value.startsWith('-');
  const canSubmit = isCompleteTemperatureGuess(value) && !disabled;

  const submit = () => {
    if (canSubmit) onSubmit();
  };

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Pressable
          style={[
            styles.minus,
            {
              backgroundColor: negative ? toRgba(colors.brand, 0.14) : toRgba(colors.muted, 0.5),
              borderColor: negative ? colors.brand : colors.border,
            },
          ]}
          onPress={() => {
            onChange(toggleMinusInGuess(value));
            inputRef.current?.focus();
          }}
          testID="minus-button"
          accessibilityRole="button"
          accessibilityLabel={negative ? t('removeMinus') : t('addMinus')}
          accessibilityState={{ selected: negative }}
          disabled={disabled}
        >
          <Text style={[styles.minusText, { color: colors.foreground }]}>+/-</Text>
        </Pressable>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.foreground, borderBottomColor: colors.brand }]}
          value={value}
          onChangeText={text => onChange(sanitizeTemperatureGuess(text))}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'decimal-pad'}
          placeholder="--"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="done"
          onSubmitEditing={submit}
          autoFocus={autoFocus}
          editable={!disabled}
          maxLength={4}
          testID="temperature-input"
          accessibilityLabel={inputLabel}
          accessibilityHint={`°${unit}`}
        />
        <Text style={[styles.unit, { color: colors.mutedForeground }]} importantForAccessibility="no">
          °{unit}
        </Text>
      </View>
      <Pressable
        style={[styles.submit, { backgroundColor: colors.brand }, !canSubmit && styles.disabled]}
        onPress={submit}
        disabled={!canSubmit}
        testID="submit-guess-button"
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
        accessibilityState={{ disabled: !canSubmit }}
      >
        <Text style={[styles.submitText, { color: colors.brandForeground }]}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { alignItems: 'center', marginBottom: 18, width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  minus: { minWidth: 60, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  minusText: { fontSize: 18, fontWeight: '700' },
  input: { fontSize: 44, fontWeight: '800', textAlign: 'center', borderBottomWidth: 4, width: 132, paddingVertical: 8, paddingHorizontal: 16 },
  unit: { fontSize: 32, fontWeight: '600' },
  submit: { marginTop: 18, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 16, alignItems: 'center', minWidth: 220, minHeight: 52 },
  submitText: { fontSize: 20, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
