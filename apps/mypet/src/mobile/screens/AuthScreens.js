import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale, useT, LOCALES } from '../context/LocaleContext';
import { hapticLight, hapticSelection } from '../lib/haptics';
import { validateLoginForm, validateRegisterForm } from '../lib/validation';
import { submitProviderApplication } from '../lib/api';
import { Field, GlassCard, HeroTitle, Notice, PrimaryButton, Screen, SecondaryButton } from '../ui';
import { lightPalette, radius, spacing, typography } from '../theme';

const palette = lightPalette;

// ─── WelcomeScreen ─────────────────────────────────────────────────────────

export function WelcomeScreen({ navigate }) {
  const { apiConfigured, apiLabel, apiReachable, preview, previewProvider } = useAuth();
  const { palette: p } = useTheme();
  const { locale, setLocale } = useLocale();
  const t = useT();
  const [submitting, setSubmitting] = useState(false);
  const [providerSubmitting, setProviderSubmitting] = useState(false);
  const [error, setError] = useState('');

  const a0 = useRef(new Animated.Value(0)).current;
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;
  const a4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(80, [a0, a1, a2, a3, a4].map((a) =>
      Animated.timing(a, { toValue: 1, duration: 480, useNativeDriver: true })
    )).start();
  }, []);

  function fs(a) {
    return {
      opacity: a,
      transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
    };
  }

  async function handlePreview() {
    setError('');
    setSubmitting(true);
    try { await preview(); }
    catch (currentError) { setError(currentError.message || 'Preview error'); }
    finally { setSubmitting(false); }
  }

  async function handleProviderPreview() {
    setError('');
    setProviderSubmitting(true);
    try { await previewProvider(); }
    catch (currentError) { setError(currentError.message || 'Preview error'); }
    finally { setProviderSubmitting(false); }
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      {/* Language selector */}
      <Animated.View style={[fs(a0), styles.localeRow]}>
        {LOCALES.map((l) => (
          <Pressable
            key={l.code}
            onPress={() => { hapticSelection(); setLocale(l.code); }}
            style={[
              styles.localeBtn,
              { borderColor: locale === l.code ? p.accent : p.line, backgroundColor: locale === l.code ? p.accentMuted : 'transparent' },
            ]}
          >
            <Text style={[styles.localeBtnText, { color: locale === l.code ? p.accentDark : p.inkSoft }]}>
              {l.flag} {l.label}
            </Text>
          </Pressable>
        ))}
      </Animated.View>

      <Animated.View style={fs(a1)}>
        <HeroTitle
          eyebrow={t('auth_welcome_eyebrow')}
          title={t('auth_welcome_title')}
          subtitle={t('auth_welcome_subtitle')}
        />
      </Animated.View>

      <Animated.View style={fs(a2)}>
        <GlassCard style={styles.heroCard}>
          <View style={styles.heroRow}>
            <QuickStat icon="calendar-check-outline" value={t('welcome_stat_1_val')} label={t('welcome_stat_1_lbl')} />
            <QuickStat icon="paw-outline"            value={t('welcome_stat_2_val')} label={t('welcome_stat_2_lbl')} />
            <QuickStat icon="hospital-box-outline"   value={t('welcome_stat_3_val')} label={t('welcome_stat_3_lbl')} />
          </View>
        </GlassCard>
      </Animated.View>

      <Animated.View style={fs(a3)}>
        {!apiConfigured ? (
          <Notice tone="warning" icon="wifi-alert" title="API not set" body="Preview mode is available." />
        ) : apiReachable === false ? (
          <Notice tone="warning" icon="wifi-alert" title="API configured" body={`Cannot reach ${apiLabel}. Check it from your phone browser.`} />
        ) : apiReachable === null ? (
          <Notice tone="warning" icon="timer-sand" title="Checking API" body={apiLabel} />
        ) : (
          <Notice tone="success" icon="check-circle-outline" title="API reachable" body={apiLabel} />
        )}
      </Animated.View>

      <Animated.View style={[fs(a4), styles.actions]}>
        {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}
        <PrimaryButton label={t('auth_signin')} onPress={() => navigate('login')} />
        <SecondaryButton label={t('auth_create_account')} icon="account-plus-outline" onPress={() => navigate('register')} />
        <View style={styles.previewRow}>
          <Pressable disabled={submitting} onPress={handlePreview} style={styles.previewLink}>
            <MaterialCommunityIcons name="account-outline" size={14} color={palette.inkSoft} />
            <Text style={[styles.previewLinkText, { color: palette.inkSoft }]}>
              {submitting ? 'Opening…' : t('auth_customer_preview')}
            </Text>
          </Pressable>
          <View style={[styles.previewDivider, { backgroundColor: palette.line }]} />
          <Pressable disabled={providerSubmitting} onPress={handleProviderPreview} style={styles.previewLink}>
            <MaterialCommunityIcons name="storefront-outline" size={14} color={palette.inkSoft} />
            <Text style={[styles.previewLinkText, { color: palette.inkSoft }]}>
              {providerSubmitting ? 'Opening…' : t('auth_provider_preview')}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Screen>
  );
}

// ─── LoginScreen ───────────────────────────────────────────────────────────

export function LoginScreen({ navigate }) {
  const { signIn, apiConfigured, apiReachable } = useAuth();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const validationError = validateLoginForm({ email, password });
    if (validationError) { setError(validationError); return; }
    setError('');
    setSubmitting(true);
    try {
      hapticLight();
      await signIn(email.trim(), password);
    } catch (currentError) {
      setError(currentError.message || 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.formWrap}>
        <HeroTitle eyebrow="Login" title={t('auth_login_title')} subtitle={t('auth_login_subtitle')} />

        <GlassCard style={styles.formCard}>
          {!apiConfigured ? (
            <Notice tone="warning" icon="wifi-alert" body="Set EXPO_PUBLIC_API_URL for live mode." />
          ) : apiReachable === false ? (
            <Notice tone="warning" icon="wifi-alert" body="API is set but unreachable from Expo Go. Use your LAN IP, not localhost." />
          ) : null}
          {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}
          <Field label={t('auth_email')} value={email} onChangeText={setEmail} placeholder="owner@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label={t('auth_password')} value={password} onChangeText={setPassword} placeholder={t('auth_password')} secureTextEntry autoCapitalize="none" />
          <PrimaryButton label={submitting ? t('auth_signing_in') : t('auth_continue')} onPress={handleSubmit} disabled={submitting} />
        </GlassCard>

        <Pressable onPress={() => navigate('register')} style={styles.inlineLink}>
          <Text style={[styles.inlineLinkText, { color: palette.inkSoft }]}>{t('auth_create_account')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

// ─── RegisterScreen ────────────────────────────────────────────────────────

export function RegisterScreen({ navigate }) {
  const { register, apiConfigured, apiReachable, mode } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const [isProvider, setIsProvider] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [providerForm, setProviderForm] = useState({ businessName: '', address: '' });
  const [tosAccepted, setTosAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function setProviderField(key, value) {
    setProviderForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    const validationError = validateRegisterForm(form, tosAccepted);
    if (validationError) { setError(validationError); return; }
    if (isProvider) {
      if (!providerForm.businessName.trim()) { setError('Укажите название организации'); return; }
      if (!providerForm.address.trim()) { setError('Укажите адрес'); return; }
    }
    setError('');
    setSubmitting(true);
    try {
      hapticLight();
      const { confirmPassword, ...payload } = form;
      await register({ ...payload, role: 'USER', tosAccepted: true });
      if (isProvider) {
        await submitProviderApplication(mode, {
          businessName: providerForm.businessName.trim(),
          address: providerForm.address.trim(),
          phone: form.phone.trim() || undefined,
        });
      }
    } catch (currentError) {
      setError(currentError.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.formWrap}>
        <HeroTitle eyebrow="Register" title={t('auth_register_title')} subtitle={t('auth_register_subtitle')} />

        <GlassCard style={styles.formCard}>
          {!apiConfigured ? (
            <Notice tone="warning" icon="wifi-alert" body="Live mode needs API." />
          ) : apiReachable === false ? (
            <Notice tone="warning" icon="wifi-alert" body="API is set but unreachable from Expo Go. Open /api-docs on your phone first." />
          ) : null}
          {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

          <View style={styles.roleToggleRow}>
            <Pressable
              style={[styles.roleToggleBtn, !isProvider && { backgroundColor: p.brand, borderColor: p.brand }]}
              onPress={() => setIsProvider(false)}
            >
              <MaterialCommunityIcons name="paw" size={16} color={!isProvider ? palette.white : p.inkSoft} />
              <Text style={[styles.roleToggleText, { color: !isProvider ? palette.white : p.inkSoft }]}>Клиент</Text>
            </Pressable>
            <Pressable
              style={[styles.roleToggleBtn, isProvider && { backgroundColor: p.brand, borderColor: p.brand }]}
              onPress={() => setIsProvider(true)}
            >
              <MaterialCommunityIcons name="store-outline" size={16} color={isProvider ? palette.white : p.inkSoft} />
              <Text style={[styles.roleToggleText, { color: isProvider ? palette.white : p.inkSoft }]}>Провайдер</Text>
            </Pressable>
          </View>

          <View style={styles.row}>
            <View style={styles.rowCell}>
              <Field label={t('auth_first_name')} value={form.firstName} onChangeText={(v) => setField('firstName', v)} placeholder="Aruzhan" autoCapitalize="words" />
            </View>
            <View style={styles.rowCell}>
              <Field label={t('auth_last_name')} value={form.lastName} onChangeText={(v) => setField('lastName', v)} placeholder="Bektas" autoCapitalize="words" />
            </View>
          </View>

          <Field label={t('auth_email')} value={form.email} onChangeText={(v) => setField('email', v)} placeholder="owner@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label={t('auth_phone')} value={form.phone} onChangeText={(v) => setField('phone', v)} placeholder="+7 777 000 0000" keyboardType="phone-pad" autoCapitalize="none" />
          <Field label={t('auth_password')} value={form.password} onChangeText={(v) => setField('password', v)} placeholder="Min 8 chars, 1 uppercase, 1 digit" secureTextEntry autoCapitalize="none" />
          <Field label={t('auth_confirm_password')} value={form.confirmPassword} onChangeText={(v) => setField('confirmPassword', v)} placeholder={t('auth_confirm_password')} secureTextEntry autoCapitalize="none" />

          {isProvider ? (
            <>
              <View style={[styles.providerDivider, { borderColor: p.border }]}>
                <Text style={[styles.providerDividerText, { color: p.inkSoft }]}>Данные организации</Text>
              </View>
              <Field label="Название организации" value={providerForm.businessName} onChangeText={(v) => setProviderField('businessName', v)} placeholder="Veterinary Clinic Barsa" autoCapitalize="words" />
              <Field label="Адрес" value={providerForm.address} onChangeText={(v) => setProviderField('address', v)} placeholder="ул. Кенесары 40, Астана" autoCapitalize="sentences" />
              <Notice tone="info" icon="information-outline" body="Заявка будет отправлена администратору. После одобрения вы получите доступ к аккаунту провайдера." />
            </>
          ) : null}

          <Pressable onPress={() => setTosAccepted((c) => !c)} style={styles.checkRow}>
            <View style={[styles.checkBox, tosAccepted ? styles.checkBoxActive : null]}>
              {tosAccepted ? <MaterialCommunityIcons name="check" size={16} color={palette.white} /> : null}
            </View>
            <Text style={[styles.checkText, { color: palette.inkSoft }]}>{t('auth_accept_terms')}</Text>
          </Pressable>

          <PrimaryButton
            label={submitting ? t('auth_creating') : (isProvider ? 'Отправить заявку' : t('auth_create_account'))}
            onPress={handleSubmit}
            disabled={submitting}
          />
        </GlassCard>

        <Pressable onPress={() => navigate('login')} style={styles.inlineLink}>
          <Text style={[styles.inlineLinkText, { color: palette.inkSoft }]}>{t('auth_back_to_login')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

// ─── QuickStat ─────────────────────────────────────────────────────────────

function QuickStat({ icon, value, label }) {
  const { palette: p } = useTheme();
  return (
    <View style={styles.quickStat}>
      <View style={[styles.quickIcon, { backgroundColor: p.surfaceMuted }]}>
        <MaterialCommunityIcons name={icon} size={18} color={p.ink} />
      </View>
      <Text style={[styles.quickValue, { color: p.ink }]}>{value}</Text>
      <Text style={[styles.quickLabel, { color: p.inkSoft }]}>{label}</Text>
    </View>
  );
}

// ─── StyleSheet ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xl,
  },
  localeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  localeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  localeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  heroCard: {
    paddingVertical: spacing.xl,
  },
  heroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  quickLabel: {
    fontSize: 12,
    fontFamily: typography.body,
  },
  actions: {
    gap: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  previewDivider: {
    width: 1,
    height: 16,
    marginHorizontal: spacing.sm,
  },
  previewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  previewLinkText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  formWrap: {
    gap: spacing.lg,
  },
  formCard: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowCell: {
    flex: 1,
  },
  checkRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: palette.black,
    borderColor: palette.black,
  },
  checkText: {
    fontSize: 13,
    fontFamily: typography.body,
  },
  inlineLink: {
    alignItems: 'center',
  },
  inlineLinkText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  roleToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.inkSoft + '40',
  },
  roleToggleText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  providerDivider: {
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  providerDividerText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: typography.body,
  },
});
