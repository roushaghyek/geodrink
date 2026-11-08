import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePalette } from '../../hooks/use-palette';

/** Back button, centred title, optional right-hand slot. */
export function ScreenHeader({ title, right, onBack }: { title: string; right?: ReactNode; onBack?: () => void }) {
  const router = useRouter();
  const colors = usePalette();
  const { t } = useLanguage();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));

  return (
    <View style={styles.bar}>
      <Pressable onPress={goBack} style={styles.side} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={8}>
        <Ionicons name="arrow-back" size={26} color={colors.brand} />
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground }]} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, minHeight: 48 },
  side: { width: 64, minHeight: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  title: { flex: 1, fontSize: 21, fontWeight: '800', textAlign: 'center' },
});
