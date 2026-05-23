import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { useT } from '../context/LocaleContext';
import { hapticLight, hapticSuccess } from '../lib/haptics';
import { radius, spacing, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    titleKey: 'onboard_1_title',
    subKey: 'onboard_1_sub',
    icon: 'paw',
    gradientA: '#34C759',
    gradientB: '#1E9E56',
  },
  {
    titleKey: 'onboard_2_title',
    subKey: 'onboard_2_sub',
    icon: 'calendar-check-outline',
    gradientA: '#007AFF',
    gradientB: '#0055CC',
  },
  {
    titleKey: 'onboard_3_title',
    subKey: 'onboard_3_sub',
    icon: 'bell-ring-outline',
    gradientA: '#FF6B35',
    gradientB: '#CC4A1A',
  },
];

export function OnboardingScreen({ onDone }) {
  const { palette: p } = useTheme();
  const t = useT();
  const [step, setStep] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Per-slide animated values
  const iconScale  = useRef(new Animated.Value(0.6)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const textY      = useRef(new Animated.Value(32)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    iconScale.setValue(0.6);
    iconOpacity.setValue(0);
    textY.setValue(32);
    textOpacity.setValue(0);

    Animated.parallel([
      Animated.spring(iconScale,  { toValue: 1, useNativeDriver: true, bounciness: 14, speed: 10 }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(textY,      { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(textOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, [step]);

  // Background color interpolation
  const colors = SLIDES.map((s) => s.gradientA);

  function advance() {
    hapticLight();
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      hapticSuccess();
      onDone();
    }
  }

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: p.bg }]}>
      {/* Hero illustration */}
      <View style={styles.heroArea}>
        <View style={[styles.heroBg, { backgroundColor: slide.gradientA + '18' }]} />
        <Animated.View
          style={[
            styles.iconCircle,
            { backgroundColor: slide.gradientA },
            { transform: [{ scale: iconScale }], opacity: iconOpacity },
          ]}
        >
          <MaterialCommunityIcons name={slide.icon} size={64} color="#fff" />
        </Animated.View>

        {/* Decorative rings */}
        <View style={[styles.ring, styles.ring1, { borderColor: slide.gradientA + '30' }]} />
        <View style={[styles.ring, styles.ring2, { borderColor: slide.gradientA + '18' }]} />
      </View>

      {/* Text content */}
      <View style={styles.textArea}>
        <Animated.Text
          style={[
            styles.title,
            { color: p.ink },
            { transform: [{ translateY: textY }], opacity: textOpacity },
          ]}
        >
          {t(slide.titleKey)}
        </Animated.Text>
        <Animated.Text
          style={[
            styles.subtitle,
            { color: p.inkSoft },
            { transform: [{ translateY: textY }], opacity: textOpacity },
          ]}
        >
          {t(slide.subKey)}
        </Animated.Text>
      </View>

      {/* Page dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Dot key={i} active={i === step} color={slide.gradientA} dark={p.line} />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={advance}
          style={[styles.primaryBtn, { backgroundColor: slide.gradientA }]}
        >
          <Text style={styles.primaryBtnText}>{isLast ? t('onboard_start') : t('onboard_next')}</Text>
          <MaterialCommunityIcons
            name={isLast ? 'arrow-right-circle-outline' : 'arrow-right'}
            size={20}
            color="#fff"
          />
        </Pressable>

        {!isLast ? (
          <Pressable onPress={() => { hapticLight(); onDone(); }} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: p.inkSoft }]}>{t('onboard_skip')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Dot({ active, color, dark }) {
  const width = useRef(new Animated.Value(active ? 24 : 8)).current;

  useEffect(() => {
    Animated.spring(width, {
      toValue: active ? 24 : 8,
      useNativeDriver: false,
      bounciness: 6,
    }).start();
  }, [active]);

  return (
    <Animated.View
      style={[
        styles.dot,
        { width, backgroundColor: active ? color : dark },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: spacing.xl,
  },
  heroArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBg: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    borderRadius: SCREEN_WIDTH * 0.36,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
  ring1: {
    width: 220,
    height: 220,
  },
  ring2: {
    width: 290,
    height: 290,
  },
  textArea: {
    gap: 12,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: typography.display,
    textAlign: 'center',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontFamily: typography.body,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryBtn: {
    minHeight: 58,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.body,
  },
});
