import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { ScroobyMood } from '../../engine/scoring';
import { usePalette } from '../../hooks/use-palette';
import { toRgba } from '../../utils/theme-colors';

export type ScroobyFace = ScroobyMood | 'hello' | 'thinking';

/**
 * Scrooby the hedgehog. PLACEHOLDER ART: an emoji hedgehog with a mood badge.
 * Swap the inner <Text> for real artwork (e.g. an <Image> per face) without
 * changing the props; every screen uses this component.
 */
const FACES: Record<ScroobyFace, { badge: string; label: string }> = {
  hello: { badge: '👋', label: 'Scrooby the hedgehog waving hello' },
  thinking: { badge: '🤔', label: 'Scrooby the hedgehog thinking' },
  happy: { badge: '😊', label: 'Scrooby the hedgehog, happy' },
  sweating: { badge: '💦', label: 'Scrooby the hedgehog, sweating' },
  shivering: { badge: '🥶', label: 'Scrooby the hedgehog, shivering' },
  sad: { badge: '😢', label: 'Scrooby the hedgehog, sad' },
};

export function Scrooby({ mood, size = 96, caption, onBrand }: { mood: ScroobyFace; size?: number; caption?: string; onBrand?: boolean }) {
  const colors = usePalette();
  const pop = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;

  const moodTint = {
    hello: colors.brand,
    thinking: colors.brand,
    happy: colors.success,
    sweating: colors.chart5,
    shivering: colors.primary,
    sad: colors.mutedForeground,
  }[mood];
  // On the deep-blue brand background, a light ring keeps Scrooby visible.
  const tint = onBrand ? colors.brandForeground : moodTint;

  useEffect(() => {
    pop.setValue(0);
    wiggle.setValue(0);
    const intro = Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true });
    const shake =
      mood === 'shivering' || mood === 'sweating'
        ? Animated.loop(
            Animated.sequence([
              Animated.timing(wiggle, { toValue: 1, duration: mood === 'shivering' ? 60 : 160, easing: Easing.linear, useNativeDriver: true }),
              Animated.timing(wiggle, { toValue: -1, duration: mood === 'shivering' ? 60 : 160, easing: Easing.linear, useNativeDriver: true }),
            ]),
            { iterations: mood === 'shivering' ? 6 : 3 }
          )
        : null;
    Animated.sequence(shake ? [intro, shake, Animated.timing(wiggle, { toValue: 0, duration: 80, useNativeDriver: true })] : [intro]).start();
  }, [mood, pop, wiggle]);

  const face = FACES[mood];

  return (
    <View style={styles.wrapper} accessible accessibilityRole="image" accessibilityLabel={caption ? `${face.label}. ${caption}` : face.label}>
      <Animated.View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: toRgba(tint, 0.14),
            borderColor: tint,
            transform: [
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
              { translateX: wiggle.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] }) },
            ],
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.52 }}>🦔</Text>
        <View
          style={[
            styles.badge,
            { width: size * 0.38, height: size * 0.38, borderRadius: size * 0.19, backgroundColor: colors.card, borderColor: tint },
          ]}
        >
          <Text style={{ fontSize: size * 0.2 }}>{face.badge}</Text>
        </View>
      </Animated.View>
      {caption ? <Text style={[styles.caption, { color: colors.foreground }]}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  badge: { position: 'absolute', right: -4, top: -4, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  caption: { marginTop: 10, fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
