import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTheme } from './context/ThemeContext';
import { lightPalette, radius, shadows, spacing, typography } from './theme';
import { hapticLight, hapticMedium, hapticSelection, hapticSuccess } from './lib/haptics';
import { isValidDateFieldValue, toDateFieldValue } from './lib/validation';

// use lightPalette as static fallback for StyleSheet (layout doesn't change with theme)
const palette = lightPalette;

// ─── Screen ────────────────────────────────────────────────────────────────

export function Screen({ children, footer, contentContainerStyle, scroll = true, refreshControl }) {
  const { palette: p, dark } = useTheme();
  const Wrapper = scroll ? ScrollView : View;
  const screenContentStyle = [
    styles.screenContent,
    footer ? styles.screenContentWithFooter : null,
    contentContainerStyle,
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: p.bg }]}>
      {dark ? (
        <>
          {/* Subtle diagonal gradient giving depth to the flat dark bg */}
          <LinearGradient
            colors={['rgba(20,28,22,0.55)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0.7 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          {/* Soft ambient green glow at top-right — almost invisible */}
          <View style={styles.darkAmbientGlow} pointerEvents="none" />
        </>
      ) : (
        <>
          <View style={[styles.backdropOrbPrimary, { backgroundColor: p.accentMuted }]} />
          <View style={[styles.backdropOrbSecondary, { backgroundColor: p.skyMuted }]} />
          <View style={[styles.backdropOrbTertiary, { backgroundColor: p.lilacMuted }]} />
        </>
      )}
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {!dark ? <View style={styles.topAccent} /> : null}
        {scroll ? (
          <Wrapper
            showsVerticalScrollIndicator={false}
            style={styles.screen}
            contentContainerStyle={screenContentStyle}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={refreshControl}
          >
            {children}
          </Wrapper>
        ) : (
          <Wrapper style={styles.screen}>
            <View style={screenContentStyle}>{children}</View>
          </Wrapper>
        )}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── GlassCard ─────────────────────────────────────────────────────────────

export function GlassCard({ children, style }) {
  const { palette: p, dark } = useTheme();
  return (
    <View style={[
      styles.card,
      { backgroundColor: p.surface, borderColor: p.line },
      dark ? styles.cardDark : null,
      style,
    ]}>
      {/* Glass inner shine — subtle top-edge light reflection in dark mode */}
      {dark ? <View style={styles.cardShine} pointerEvents="none" /> : null}
      {children}
    </View>
  );
}

// ─── HeroTitle ─────────────────────────────────────────────────────────────

export function HeroTitle({ eyebrow, title, subtitle, action, trailing }) {
  const { palette: p } = useTheme();
  return (
    <View style={styles.heroBlock}>
      <View style={styles.heroTopRow}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={[styles.eyebrow, { color: p.accentDark }]}>{eyebrow}</Text> : null}
          <Text style={[styles.heroTitle, { color: p.ink }]}>{title}</Text>
        </View>
        {trailing ?? null}
      </View>
      {subtitle ? <Text style={[styles.heroSubtitle, { color: p.inkSoft }]}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

// ─── SectionTitle ──────────────────────────────────────────────────────────

export function SectionTitle({ title, subtitle, trailing }) {
  const { palette: p } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionCopy}>
        <Text style={[styles.sectionTitle, { color: p.ink }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sectionSubtitle, { color: p.inkSoft }]}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

// ─── PrimaryButton ─────────────────────────────────────────────────────────

export function PrimaryButton({ label, icon, onPress, disabled, compact, style }) {
  const { palette: p, dark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    if (!disabled) hapticLight();
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 5 }).start();
  }

  const innerContent = (
    <>
      <Text style={[styles.primaryButtonText, { color: dark ? '#4ADE80' : p.bg }]}>{label}</Text>
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={dark ? '#4ADE80' : p.bg} /> : null}
    </>
  );

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={disabled ? undefined : pressIn}
      onPressOut={disabled ? undefined : pressOut}
    >
      <Animated.View style={[disabled ? styles.buttonDisabled : null, { transform: [{ scale }] }]}>
        {dark ? (
          <LinearGradient
            colors={['#1A3326', '#1E3D2E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              style,
              styles.buttonBase,
              compact ? styles.buttonCompact : null,
              styles.buttonDarkBorder,
            ]}
          >
            {innerContent}
          </LinearGradient>
        ) : (
          <View style={[style, styles.buttonBase, compact ? styles.buttonCompact : null, { backgroundColor: p.black }]}>
            {innerContent}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── SecondaryButton ───────────────────────────────────────────────────────

export function SecondaryButton({ label, icon, onPress, style }) {
  const { palette: p } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    hapticLight();
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 5 }).start();
  }

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View
        style={[
          style,
          styles.buttonBase,
          styles.buttonSecondaryHeight,
          { backgroundColor: p.surface, borderColor: p.line, borderWidth: 1 },
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[styles.secondaryButtonText, { color: p.ink }]}>{label}</Text>
        {icon ? <MaterialCommunityIcons name={icon} size={18} color={p.ink} /> : null}
      </Animated.View>
    </Pressable>
  );
}

// ─── Pill ──────────────────────────────────────────────────────────────────

export function Pill({ label, active, icon, onPress, style }) {
  const { palette: p } = useTheme();
  return (
    <Pressable
      onPress={() => { hapticSelection(); onPress?.(); }}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: active ? p.black : p.surface, borderColor: active ? p.black : p.line },
        style,
        pressed ? styles.pressed : null,
      ]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={16} color={active ? p.bg : p.ink} /> : null}
      <Text style={[styles.pillText, { color: active ? p.bg : p.ink }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────

export function Field({ label, value, onChangeText, placeholder, multiline, secureTextEntry, keyboardType, autoCapitalize = 'sentences', error }) {
  const { palette: p } = useTheme();
  return (
    <View style={styles.fieldBlock}>
      {label ? <Text style={[styles.fieldLabel, { color: p.inkSoft }]}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={p.inkSoft}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[
          styles.fieldInput,
          { backgroundColor: p.surface, borderColor: error ? p.danger : p.line, color: p.ink },
          multiline ? styles.fieldTextarea : null,
        ]}
      />
      {error ? <Text style={[styles.fieldError, { color: p.danger }]}>{error}</Text> : null}
    </View>
  );
}

// ─── DateField ─────────────────────────────────────────────────────────────

export function DateField({ label, value, onChange, placeholder = 'Select date', maximumDate, minimumDate, error }) {
  const { palette: p } = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(new Date());
  const parsedValue = isValidDateFieldValue(value) ? new Date(`${value}T00:00:00`) : new Date();

  function handlePickerChange(event, selectedDate) {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') return;
      if (selectedDate) onChange(toDateFieldValue(selectedDate));
      return;
    }
    if (selectedDate) setIosDraft(selectedDate);
  }

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: parsedValue, mode: 'date', maximumDate, minimumDate, onChange: handlePickerChange });
      return;
    }
    setIosDraft(parsedValue);
    setIosOpen(true);
  }

  function handleIosConfirm() {
    onChange(toDateFieldValue(iosDraft));
    setIosOpen(false);
  }

  return (
    <View style={styles.fieldBlock}>
      {label ? <Text style={[styles.fieldLabel, { color: p.inkSoft }]}>{label}</Text> : null}
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [
          styles.dateFieldButton,
          { backgroundColor: p.surface, borderColor: error ? p.danger : p.line },
          pressed ? styles.pressed : null,
        ]}
      >
        <Text style={[styles.dateFieldText, { color: value ? p.ink : p.inkSoft }]}>
          {value ? formatDateLabel(value) : placeholder}
        </Text>
        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={p.inkSoft} />
      </Pressable>
      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View style={styles.dateModalScrim}>
            <Pressable style={styles.dateModalBackdrop} onPress={() => setIosOpen(false)} />
            <View style={[styles.dateModalSheet, { backgroundColor: p.surfaceMuted }]}>
              <View style={styles.dateModalHeader}>
                <Pressable onPress={() => setIosOpen(false)} style={styles.dateModalAction}>
                  <Text style={[styles.dateModalActionText, { color: p.accentDark }]}>Cancel</Text>
                </Pressable>
                <Text style={[styles.dateModalTitle, { color: p.ink }]}>{label || 'Select date'}</Text>
                <Pressable onPress={handleIosConfirm} style={styles.dateModalAction}>
                  <Text style={[styles.dateModalActionText, { color: p.accentDark }]}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosDraft}
                mode="date"
                display="spinner"
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                onChange={handlePickerChange}
                style={styles.dateModalPicker}
              />
            </View>
          </View>
        </Modal>
      ) : null}
      {error ? <Text style={[styles.fieldError, { color: p.danger }]}>{error}</Text> : null}
    </View>
  );
}

// ─── Notice ────────────────────────────────────────────────────────────────

export function Notice({ tone = 'neutral', title, body, icon }) {
  const { dark } = useTheme();

  const tones = {
    neutral: { bg: dark ? '#1C2128' : palette.surfaceMuted, border: dark ? '#30363D' : palette.line, text: dark ? '#E6EDF3' : palette.ink },
    success: { bg: dark ? '#0A2518' : '#EDF9F2', border: dark ? '#1A5C35' : '#CFEFD9', text: dark ? '#3DD68C' : palette.ink },
    warning: { bg: dark ? '#2D1F00' : '#FFF7EA', border: dark ? '#6E4A00' : '#F7DFC0', text: dark ? '#D29922' : palette.ink },
    danger:  { bg: dark ? '#2D0A0A' : '#FFF0F0', border: dark ? '#6E1515' : '#F6D0D0', text: dark ? '#F85149' : palette.ink },
  };

  const ct = tones[tone] || tones.neutral;

  return (
    <View style={[styles.notice, { backgroundColor: ct.bg, borderColor: ct.border }]}>
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={ct.text} /> : null}
      <View style={styles.noticeCopy}>
        {title ? <Text style={[styles.noticeTitle, { color: ct.text }]}>{title}</Text> : null}
        {body  ? <Text style={[styles.noticeBody,  { color: ct.text }]}>{body}</Text>  : null}
      </View>
    </View>
  );
}

// ─── AvatarBadge ───────────────────────────────────────────────────────────

export function AvatarBadge({ label, sublabel, accent, icon = 'paw', initials, style }) {
  const { palette: p } = useTheme();
  return (
    <View style={[styles.avatarBadge, { backgroundColor: p.surface, borderColor: p.line }, style]}>
      <View style={[styles.avatarHalo, accent ? { backgroundColor: accent[0] } : { backgroundColor: p.black }]}>
        {initials ? (
          <Text style={[styles.avatarInitials, { color: p.bg }]}>{initials}</Text>
        ) : (
          <MaterialCommunityIcons name={icon} size={22} color={p.bg} />
        )}
      </View>
      <View style={styles.avatarCopy}>
        <Text style={[styles.avatarLabel, { color: p.ink }]}>{label}</Text>
        {sublabel ? <Text style={[styles.avatarSublabel, { color: p.inkSoft }]}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

// ─── StatusBadge ───────────────────────────────────────────────────────────

export function StatusBadge({ label, tone = 'neutral' }) {
  const { dark } = useTheme();
  const tones = {
    neutral: { bg: dark ? '#21262D' : palette.surfaceMuted, text: dark ? '#8B949E' : palette.inkSoft },
    success: { bg: dark ? '#0A2518' : '#EAF9F0', text: dark ? '#3DD68C' : palette.success },
    warning: { bg: dark ? '#2D1F00' : '#FFF4E3', text: dark ? '#D29922' : palette.warning },
    danger:  { bg: dark ? '#2D0A0A' : '#FFF0F0', text: dark ? '#F85149' : palette.danger },
  };
  const ct = tones[tone] || tones.neutral;
  return (
    <View style={[styles.statusBadge, { backgroundColor: ct.bg }]}>
      <Text style={[styles.statusBadgeText, { color: ct.text }]}>{label}</Text>
    </View>
  );
}

// ─── RatingStars ───────────────────────────────────────────────────────────

export function RatingStars({ rating }) {
  const { palette: p } = useTheme();
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((value) => (
        <MaterialCommunityIcons
          key={value}
          name={rating >= value ? 'star' : 'star-outline'}
          size={16}
          color={rating >= value ? p.warning : p.inkSoft}
        />
      ))}
    </View>
  );
}

// ─── BottomTabs ────────────────────────────────────────────────────────────

function TabItem({ item, active, onSelect }) {
  const { palette: p, dark } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    hapticSelection();
    Animated.spring(scale, { toValue: 0.86, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 12 }).start();
  }

  const activeTabBg = dark ? 'rgba(45,190,108,0.12)' : p.surfaceTint;
  const activeColor = dark ? '#4ADE80' : p.black;

  return (
    <Pressable
      onPress={() => onSelect(item.key)}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={[styles.tabItem, active ? { backgroundColor: activeTabBg } : null]}
    >
      <Animated.View style={[styles.tabIconWrap, { transform: [{ scale }] }]}>
        <MaterialCommunityIcons name={item.icon} size={20} color={active ? activeColor : p.inkSoft} />
        {item.badge > 0 ? (
          <View style={[styles.tabBadge, { backgroundColor: p.danger }]}>
            <Text style={[styles.tabBadgeText, { color: '#fff' }]}>{item.badge > 9 ? '9+' : item.badge}</Text>
          </View>
        ) : null}
      </Animated.View>
      <Text style={[styles.tabLabel, { color: active ? activeColor : p.inkSoft }, active ? styles.tabLabelActive : null]}>
        {item.label}
      </Text>
      {active && !dark ? <View style={[styles.tabActiveDot, { backgroundColor: p.accent }]} /> : null}
    </Pressable>
  );
}

export function BottomTabs({ items, current, onSelect }) {
  const { dark, palette: p } = useTheme();

  const tabContent = items.map((item) => (
    <TabItem key={item.key} item={item} active={item.key === current} onSelect={onSelect} />
  ));

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.tabShell}>
        <BlurView
          intensity={dark ? 55 : 68}
          tint={dark ? 'dark' : 'light'}
          style={[styles.tabBarBlur, { borderColor: p.line }]}
        >
          <View style={styles.tabRow}>{tabContent}</View>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={styles.tabShell}>
      <View style={[styles.tabBar, { backgroundColor: dark ? 'rgba(17,19,21,0.96)' : 'rgba(255,255,255,0.94)', borderColor: p.line }]}>
        {tabContent}
      </View>
    </View>
  );
}

// ─── EmptyState (animated) ─────────────────────────────────────────────────

export function EmptyState({ icon, title, subtitle, action }) {
  const { palette: p } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={[styles.emptyState, { backgroundColor: p.surface, borderColor: p.line }]}>
      <Animated.View style={[styles.emptyIcon, { backgroundColor: p.surfaceMuted, transform: [{ scale: pulse }] }]}>
        <MaterialCommunityIcons name={icon} size={24} color={p.ink} />
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: p.ink }]}>{title}</Text>
      {subtitle ? <Text style={[styles.emptySubtitle, { color: p.inkSoft }]}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

// ─── LoadingState ──────────────────────────────────────────────────────────

export function LoadingState({ label = 'Loading' }) {
  const { palette: p } = useTheme();
  return (
    <Screen scroll={false} contentContainerStyle={styles.loadingWrap}>
      <View style={[styles.loadingCard, { backgroundColor: p.surface, borderColor: p.line }]}>
        <ActivityIndicator size="small" color={p.black} />
        <Text style={[styles.loadingText, { color: p.inkSoft }]}>{label}</Text>
      </View>
    </Screen>
  );
}

// ─── SkeletonLoader ────────────────────────────────────────────────────────

export function SkeletonLoader({ style }) {
  const { palette: p } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  return <Animated.View style={[{ backgroundColor: p.line, borderRadius: 8 }, style, { opacity }]} />;
}

export function SkeletonCard() {
  return (
    <GlassCard style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <SkeletonLoader style={{ width: 44, height: 44, borderRadius: 22 }} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonLoader style={{ height: 14, borderRadius: 7, width: '65%' }} />
          <SkeletonLoader style={{ height: 10, borderRadius: 5, width: '40%' }} />
        </View>
        <SkeletonLoader style={{ width: 56, height: 22, borderRadius: 11 }} />
      </View>
      <SkeletonLoader style={{ height: 10, borderRadius: 5 }} />
      <SkeletonLoader style={{ height: 10, borderRadius: 5, width: '75%' }} />
    </GlassCard>
  );
}

// ─── BottomSheet ───────────────────────────────────────────────────────────

export function BottomSheet({ visible, onClose, children, title }) {
  const { palette: p } = useTheme();
  const translateY = useRef(new Animated.Value(800)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 800, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible && translateY._value >= 799) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.sheetScrim, { opacity }]}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheetContainer,
          { backgroundColor: p.surface, borderTopColor: p.line, transform: [{ translateY }] },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: p.line }]} />
        {title ? (
          <View style={[styles.sheetHeader, { borderBottomColor: p.line }]}>
            <Text style={[styles.sheetTitle, { color: p.ink }]}>{title}</Text>
            <Pressable onPress={onClose} style={styles.sheetClose}>
              <MaterialCommunityIcons name="close" size={20} color={p.inkSoft} />
            </Pressable>
          </View>
        ) : null}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── ThemeToggle ───────────────────────────────────────────────────────────

export function ThemeToggle() {
  const { dark, toggleDark, palette: p } = useTheme();
  const slideX = useRef(new Animated.Value(dark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideX, { toValue: dark ? 1 : 0, useNativeDriver: true, bounciness: 8, speed: 20 }).start();
  }, [dark]);

  const thumbX = slideX.interpolate({ inputRange: [0, 1], outputRange: [2, 22] });

  return (
    <Pressable
      onPress={() => { hapticMedium(); toggleDark(); }}
      style={[styles.toggle, { backgroundColor: dark ? p.accent : p.line }]}
    >
      <Animated.View style={[styles.toggleThumb, { transform: [{ translateX: thumbX }] }]} />
    </Pressable>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDateLabel(value) {
  const date = isValidDateFieldValue(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

// ─── StyleSheet ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  darkAmbientGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(45,190,108,0.045)',
  },
  backdropOrbPrimary: {
    position: 'absolute',
    top: -40,
    right: -24,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: palette.accentMuted,
    opacity: 0.75,
  },
  backdropOrbSecondary: {
    position: 'absolute',
    top: 180,
    left: -54,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: palette.skyMuted,
    opacity: 0.65,
  },
  backdropOrbTertiary: {
    position: 'absolute',
    bottom: 120,
    right: -36,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: palette.lilacMuted,
    opacity: 0.5,
  },
  topAccent: {
    width: 88,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 140,
    gap: spacing.lg,
  },
  screenContentWithFooter: {
    paddingBottom: 170,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadows.card,
  },
  cardDark: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  heroBlock: {
    gap: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: palette.accentDark,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 30,
    lineHeight: 34,
    fontFamily: typography.display,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: palette.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: typography.display,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: palette.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: typography.body,
  },
  buttonBase: {
    minHeight: 56,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonCompact: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  buttonSecondaryHeight: {
    minHeight: 52,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonDarkBorder: {
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.18)',
  },
  primaryButtonText: {
    color: palette.white,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  secondaryButtonText: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  pill: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    color: palette.inkSoft,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  fieldInput: {
    minHeight: 54,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    color: palette.ink,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: typography.body,
  },
  fieldTextarea: {
    minHeight: 108,
    textAlignVertical: 'top',
  },
  fieldError: {
    color: palette.danger,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typography.body,
  },
  dateFieldButton: {
    minHeight: 54,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dateFieldText: {
    color: palette.ink,
    fontSize: 15,
    fontFamily: typography.body,
  },
  dateModalScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,19,21,0.40)',
  },
  dateModalBackdrop: {
    flex: 1,
  },
  dateModalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: '#F7F8FA',
  },
  dateModalHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dateModalAction: {
    minWidth: 64,
    minHeight: 36,
    justifyContent: 'center',
  },
  dateModalActionText: {
    color: palette.accentDark,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  dateModalTitle: {
    flex: 1,
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: typography.body,
  },
  dateModalPicker: {
    alignSelf: 'center',
  },
  notice: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  noticeCopy: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  noticeBody: {
    color: palette.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
  },
  avatarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadows.card,
  },
  avatarHalo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.black,
  },
  avatarInitials: {
    color: palette.white,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  avatarCopy: {
    flex: 1,
    gap: 2,
  },
  avatarLabel: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  avatarSublabel: {
    color: palette.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
  },
  tabShell: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  tabBarBlur: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    padding: 6,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  tabItem: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabIconWrap: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: palette.white,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  tabActiveDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.accent,
  },
  tabLabel: {
    color: '#7D848C',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  tabLabelActive: {
    color: palette.black,
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceMuted,
  },
  emptyTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: typography.display,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: palette.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: typography.body,
  },
  loadingWrap: {
    justifyContent: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    gap: 10,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
  },
  loadingText: {
    color: palette.inkSoft,
    fontSize: 14,
    fontFamily: typography.body,
  },
  // BottomSheet
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    backgroundColor: palette.surface,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.line,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  sheetTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  sheetClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  // ThemeToggle
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    backgroundColor: palette.line,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.92,
  },
});
