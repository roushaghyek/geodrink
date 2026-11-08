import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '../../hooks/use-palette';
import { toRgba } from '../../utils/theme-colors';

interface Props {
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** Short status on the right, e.g. "🔥 4" or "Best 12". */
  badge?: string;
  featured?: boolean;
  testID?: string;
}

/** A big, thumb-friendly mode button for the home screen. */
export function ModeCard({ title, subtitle, icon, onPress, badge, featured, testID }: Props) {
  const colors = usePalette();
  const fg = featured ? colors.brandForeground : colors.foreground;
  const sub = featured ? toRgba(colors.brandForeground, 0.85) : colors.mutedForeground;

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={badge ? `${subtitle}. ${badge}` : subtitle}
      style={({ pressed }) => [
        styles.card,
        featured
          ? { backgroundColor: colors.brand, borderColor: colors.brand }
          : { backgroundColor: colors.card, borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: featured ? toRgba(colors.brandForeground, 0.18) : toRgba(colors.brand, 0.12) }]}>
        <Ionicons name={icon} size={26} color={featured ? colors.brandForeground : colors.brand} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: fg }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: sub }]}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: featured ? toRgba(colors.brandForeground, 0.18) : toRgba(colors.brand, 0.1) }]}>
          <Text style={[styles.badgeText, { color: fg }]}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={22} color={sub} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, borderWidth: 1, padding: 16, minHeight: 84 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 2 },
  badge: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  badgeText: { fontSize: 14, fontWeight: '800' },
});
