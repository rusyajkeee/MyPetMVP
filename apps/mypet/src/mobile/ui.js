import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette, radius, shadows, spacing, typography } from './theme';
import { isValidDateFieldValue, toDateFieldValue } from './lib/validation';

export function Screen({ children, footer, contentContainerStyle, scroll = true }) {
  const Wrapper = scroll ? ScrollView : View;
  const screenContentStyle = [
    styles.screenContent,
    footer ? styles.screenContentWithFooter : null,
    contentContainerStyle,
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.backdropOrbPrimary} />
      <View style={styles.backdropOrbSecondary} />
      <View style={styles.backdropOrbTertiary} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.topAccent} />
        {scroll ? (
          <Wrapper
            showsVerticalScrollIndicator={false}
            style={styles.screen}
            contentContainerStyle={screenContentStyle}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentInsetAdjustmentBehavior="automatic"
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

export function GlassCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function HeroTitle({ eyebrow, title, subtitle, action }) {
  return (
    <View style={styles.heroBlock}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

export function SectionTitle({ title, subtitle, trailing }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

export function PrimaryButton({ label, icon, onPress, disabled, compact, style }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [style, styles.buttonBase, compact ? styles.buttonCompact : null, styles.primaryButton, disabled ? styles.buttonDisabled : null, pressed && !disabled ? styles.pressed : null]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={palette.white} /> : null}
    </Pressable>
  );
}

export function SecondaryButton({ label, icon, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [style, styles.buttonBase, compactStyles.default, styles.secondaryButton, pressed ? styles.pressed : null]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={palette.ink} /> : null}
    </Pressable>
  );
}

const compactStyles = {
  default: {
    minHeight: 52,
  },
};

export function Pill({ label, active, icon, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, active ? styles.pillActive : null, style, pressed ? styles.pressed : null]}>
      {icon ? <MaterialCommunityIcons name={icon} size={16} color={active ? palette.white : palette.ink} /> : null}
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, multiline, secureTextEntry, keyboardType, autoCapitalize = 'sentences', error }) {
  return (
    <View style={styles.fieldBlock}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA1A9"
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.fieldInput, multiline ? styles.fieldTextarea : null, error ? styles.fieldInputError : null]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function DateField({ label, value, onChange, placeholder = 'Select date', maximumDate, minimumDate, error }) {
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(new Date());
  const parsedValue = isValidDateFieldValue(value) ? new Date(`${value}T00:00:00`) : new Date();

  function handlePickerChange(event, selectedDate) {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') return;
      if (selectedDate) onChange(toDateFieldValue(selectedDate));
      return;
    }

    if (selectedDate) {
      setIosDraft(selectedDate);
    }
  }

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parsedValue,
        mode: 'date',
        maximumDate,
        minimumDate,
        onChange: handlePickerChange,
      });
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
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <Pressable onPress={openPicker} style={({ pressed }) => [styles.dateFieldButton, error ? styles.fieldInputError : null, pressed ? styles.pressed : null]}>
        <Text style={[styles.dateFieldText, !value ? styles.dateFieldPlaceholder : null]}>
          {value ? formatDateLabel(value) : placeholder}
        </Text>
        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={palette.inkSoft} />
      </Pressable>
      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View style={styles.dateModalScrim}>
            <Pressable style={styles.dateModalBackdrop} onPress={() => setIosOpen(false)} />
            <View style={styles.dateModalSheet}>
              <View style={styles.dateModalHeader}>
                <Pressable onPress={() => setIosOpen(false)} style={styles.dateModalAction}>
                  <Text style={styles.dateModalActionText}>Cancel</Text>
                </Pressable>
                <Text style={styles.dateModalTitle}>{label || 'Select date'}</Text>
                <Pressable onPress={handleIosConfirm} style={styles.dateModalAction}>
                  <Text style={styles.dateModalActionText}>Done</Text>
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
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Notice({ tone = 'neutral', title, body, icon }) {
  const tones = {
    neutral: { bg: palette.surfaceMuted, border: palette.line, text: palette.ink },
    success: { bg: '#EDF9F2', border: '#CFEFD9', text: palette.ink },
    warning: { bg: '#FFF7EA', border: '#F7DFC0', text: palette.ink },
    danger: { bg: '#FFF0F0', border: '#F6D0D0', text: palette.ink },
  };

  const currentTone = tones[tone] || tones.neutral;

  return (
    <View style={[styles.notice, { backgroundColor: currentTone.bg, borderColor: currentTone.border }]}>
      {icon ? <MaterialCommunityIcons name={icon} size={18} color={currentTone.text} /> : null}
      <View style={styles.noticeCopy}>
        {title ? <Text style={styles.noticeTitle}>{title}</Text> : null}
        {body ? <Text style={styles.noticeBody}>{body}</Text> : null}
      </View>
    </View>
  );
}

export function AvatarBadge({ label, sublabel, accent, icon = 'paw', initials, style }) {
  return (
    <View style={[styles.avatarBadge, style]}>
      <View style={[styles.avatarHalo, accent ? { backgroundColor: accent[0] } : null]}>
        {initials ? (
          <Text style={styles.avatarInitials}>{initials}</Text>
        ) : (
          <MaterialCommunityIcons name={icon} size={22} color={palette.white} />
        )}
      </View>
      <View style={styles.avatarCopy}>
        <Text style={styles.avatarLabel}>{label}</Text>
        {sublabel ? <Text style={styles.avatarSublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

export function StatusBadge({ label, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: palette.surfaceMuted, text: palette.inkSoft },
    success: { bg: '#EAF9F0', text: palette.success },
    warning: { bg: '#FFF4E3', text: palette.warning },
    danger: { bg: '#FFF0F0', text: palette.danger },
  };

  const currentTone = tones[tone] || tones.neutral;

  return (
    <View style={[styles.statusBadge, { backgroundColor: currentTone.bg }]}>
      <Text style={[styles.statusBadgeText, { color: currentTone.text }]}>{label}</Text>
    </View>
  );
}

export function RatingStars({ rating }) {
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((value) => (
        <MaterialCommunityIcons
          key={value}
          name={rating >= value ? 'star' : 'star-outline'}
          size={16}
          color={rating >= value ? palette.warning : '#B7BDC6'}
        />
      ))}
    </View>
  );
}

export function BottomTabs({ items, current, onSelect }) {
  return (
    <View style={styles.tabShell}>
      <View style={styles.tabBar}>
        {items.map((item) => {
          const active = item.key === current;

          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => [styles.tabItem, active ? styles.tabItemActive : null, pressed ? styles.pressed : null]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={20}
                color={active ? palette.black : '#7D848C'}
              />
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name={icon} size={24} color={palette.ink} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

export function LoadingState({ label = 'Loading' }) {
  return (
    <Screen scroll={false} contentContainerStyle={styles.loadingWrap}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="small" color={palette.black} />
        <Text style={styles.loadingText}>{label}</Text>
      </View>
    </Screen>
  );
}

function formatDateLabel(value) {
  const date = isValidDateFieldValue(value) ? new Date(`${value}T00:00:00`) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
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
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  screenContentWithFooter: {
    paddingBottom: 140,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadows.card,
  },
  heroBlock: {
    gap: 6,
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
  primaryButton: {
    backgroundColor: palette.black,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: palette.line,
  },
  buttonDisabled: {
    opacity: 0.5,
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
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: palette.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillActive: {
    backgroundColor: palette.black,
    borderColor: palette.black,
  },
  pillText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  pillTextActive: {
    color: palette.white,
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
  fieldInputError: {
    borderColor: palette.danger,
  },
  fieldTextarea: {
    minHeight: 108,
    textAlignVertical: 'top',
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
  dateFieldPlaceholder: {
    color: '#9AA1A9',
  },
  dateModalScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,19,21,0.18)',
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
  fieldError: {
    color: palette.danger,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: typography.body,
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
  },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: palette.line,
    ...shadows.card,
  },
  tabItem: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabItemActive: {
    backgroundColor: palette.surfaceTint,
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
  pressed: {
    opacity: 0.92,
  },
});
