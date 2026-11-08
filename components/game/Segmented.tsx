import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../hooks/use-palette';

interface Option<T> {
  value: T;
  label: string;
}

/** A row of mutually exclusive choices (accessible as radio buttons). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  testIDPrefix,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  testIDPrefix?: string;
}) {
  const colors = usePalette();
  return (
    <View style={[styles.row, { backgroundColor: colors.muted, borderColor: colors.border }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected && { backgroundColor: colors.brand }]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            accessibilityLabel={option.label}
            testID={testIDPrefix ? `${testIDPrefix}-${option.value}` : undefined}
          >
            <Text style={[styles.text, { color: selected ? colors.brandForeground : colors.foreground }]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, gap: 4 },
  option: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  text: { fontSize: 15, fontWeight: '700' },
});
