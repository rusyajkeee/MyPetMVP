import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { validateLoginForm, validateRegisterForm } from '../lib/validation';
import { Field, GlassCard, HeroTitle, Notice, PrimaryButton, Screen, SecondaryButton } from '../ui';
import { palette, spacing, typography } from '../theme';

export function WelcomeScreen({ navigate }) {
  const { apiConfigured, apiLabel, apiReachable, preview } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handlePreview() {
    setError('');
    setSubmitting(true);
    try {
      await preview();
    } catch (currentError) {
      setError(currentError.message || 'Preview error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <HeroTitle
        eyebrow="MyPet"
        title="Pet care in one app"
        subtitle="Book, manage, repeat."
      />

      <GlassCard style={styles.heroCard}>
        <View style={styles.heroRow}>
          <QuickStat icon="calendar-check-outline" value="Fast" label="booking" />
          <QuickStat icon="paw-outline" value="Pets" label="profiles" />
          <QuickStat icon="hospital-box-outline" value="Care" label="notes" />
        </View>
      </GlassCard>

      {!apiConfigured ? (
        <Notice
          tone="warning"
          icon="wifi-alert"
          title="API not set"
          body="Preview mode is available."
        />
      ) : apiReachable === false ? (
        <Notice
          tone="warning"
          icon="wifi-alert"
          title="API configured"
          body={`Cannot reach ${apiLabel}. Check it from your phone browser.`}
        />
      ) : apiReachable === null ? (
        <Notice
          tone="warning"
          icon="timer-sand"
          title="Checking API"
          body={apiLabel}
        />
      ) : (
        <Notice
          tone="success"
          icon="check-circle-outline"
          title="API reachable"
          body={apiLabel}
        />
      )}

      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      <View style={styles.actions}>
        <PrimaryButton label="Sign in" onPress={() => navigate('login')} />
        <SecondaryButton label="Create account" icon="account-plus-outline" onPress={() => navigate('register')} />
        <Pressable disabled={submitting} onPress={handlePreview} style={styles.previewLink}>
          <Text style={styles.previewLinkText}>{submitting ? 'Opening...' : 'Open preview'}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

export function LoginScreen({ navigate }) {
  const { signIn, apiConfigured, apiReachable } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const validationError = validateLoginForm({ email, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
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
        <HeroTitle eyebrow="Login" title="Welcome back" subtitle="Enter your account" />

        <GlassCard style={styles.formCard}>
          {!apiConfigured ? (
            <Notice tone="warning" icon="wifi-alert" body="Set EXPO_PUBLIC_API_URL for live mode." />
          ) : apiReachable === false ? (
            <Notice tone="warning" icon="wifi-alert" body="API is set but unreachable from Expo Go. Use your LAN IP, not localhost." />
          ) : null}
          {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="owner@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry autoCapitalize="none" />
          <PrimaryButton label={submitting ? 'Signing in' : 'Continue'} onPress={handleSubmit} disabled={submitting} />
        </GlassCard>

        <Pressable onPress={() => navigate('register')} style={styles.inlineLink}>
          <Text style={styles.inlineLinkText}>Create account</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

export function RegisterScreen({ navigate }) {
  const { register, apiConfigured, apiReachable } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [tosAccepted, setTosAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    const validationError = validateRegisterForm(form, tosAccepted);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await register({
        ...form,
        role: 'USER',
        tosAccepted: true,
      });
    } catch (currentError) {
      setError(currentError.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.formWrap}>
        <HeroTitle eyebrow="Register" title="Create account" subtitle="Start in a minute" />

        <GlassCard style={styles.formCard}>
          {!apiConfigured ? (
            <Notice tone="warning" icon="wifi-alert" body="Live mode needs API." />
          ) : apiReachable === false ? (
            <Notice tone="warning" icon="wifi-alert" body="API is set but unreachable from Expo Go. Open /api-docs on your phone first." />
          ) : null}
          {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

          <View style={styles.row}>
            <View style={styles.rowCell}>
              <Field label="First name" value={form.firstName} onChangeText={(value) => setField('firstName', value)} placeholder="Aruzhan" />
            </View>
            <View style={styles.rowCell}>
              <Field label="Last name" value={form.lastName} onChangeText={(value) => setField('lastName', value)} placeholder="Bektas" />
            </View>
          </View>

          <Field label="Email" value={form.email} onChangeText={(value) => setField('email', value)} placeholder="owner@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" value={form.phone} onChangeText={(value) => setField('phone', value)} placeholder="+7 777 000 0000" keyboardType="phone-pad" autoCapitalize="none" />
          <Field label="Password" value={form.password} onChangeText={(value) => setField('password', value)} placeholder="Password" secureTextEntry autoCapitalize="none" />

          <Pressable onPress={() => setTosAccepted((current) => !current)} style={styles.checkRow}>
            <View style={[styles.checkBox, tosAccepted ? styles.checkBoxActive : null]}>
              {tosAccepted ? <MaterialCommunityIcons name="check" size={16} color={palette.white} /> : null}
            </View>
            <Text style={styles.checkText}>Accept terms</Text>
          </Pressable>

          <PrimaryButton label={submitting ? 'Creating' : 'Create account'} onPress={handleSubmit} disabled={submitting} />
        </GlassCard>

        <Pressable onPress={() => navigate('login')} style={styles.inlineLink}>
          <Text style={styles.inlineLinkText}>Back to login</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function QuickStat({ icon, value, label }) {
  return (
    <View style={styles.quickStat}>
      <View style={styles.quickIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={palette.ink} />
      </View>
      <Text style={styles.quickValue}>{value}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xl,
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
    backgroundColor: palette.surfaceMuted,
  },
  quickValue: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  quickLabel: {
    color: palette.inkSoft,
    fontSize: 12,
    fontFamily: typography.body,
  },
  actions: {
    gap: 12,
  },
  previewLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  previewLinkText: {
    color: palette.inkSoft,
    fontSize: 14,
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
    color: palette.inkSoft,
    fontSize: 13,
    fontFamily: typography.body,
  },
  inlineLink: {
    alignItems: 'center',
  },
  inlineLinkText: {
    color: palette.inkSoft,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.body,
  },
});
