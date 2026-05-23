import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../context/LocaleContext';
import {
  getProviderStats,
  listProviderBookings,
  listProviderServices,
  updateProfile,
  updateProviderBookingStatus,
  updateProviderService,
} from '../lib/api';
import { formatDateTime, formatMoney, relativeLabel } from '../lib/format';
import {
  AvatarBadge,
  EmptyState,
  Field,
  GlassCard,
  HeroTitle,
  Notice,
  Pill,
  PrimaryButton,
  Screen,
  SectionTitle,
  SecondaryButton,
  SkeletonCard,
  StatusBadge,
  ThemeToggle,
} from '../ui';
import { lightPalette, radius, spacing, typography } from '../theme';

const palette = lightPalette;

const STATUS_TONE = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  IN_PROGRESS: 'warning',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
};

const INBOX_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'New' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'IN_PROGRESS', label: 'Active' },
  { key: 'COMPLETED', label: 'Done' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

// ─── Dashboard ─────────────────────────────────────────────────────────────

export function ProviderDashboardScreen({ navigate }) {
  const { mode, user } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState('');

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [nextStats, nextBookings] = await Promise.all([
        getProviderStats(mode),
        listProviderBookings(mode),
      ]);
      setStats(nextStats);
      setBookings(nextBookings);
    } catch (err) {
      setActionError(err.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [mode]);

  async function handleAction(bookingId, status) {
    setActionError('');
    try {
      await updateProviderBookingStatus(mode, bookingId, status);
      await load();
    } catch (err) {
      setActionError(err.message || 'Action failed.');
    }
  }

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING').slice(0, 3);
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayBookings = bookings.filter(
    (b) => b.scheduledAt?.slice(0, 10) === todayStr && (b.status === 'ACCEPTED' || b.status === 'IN_PROGRESS')
  );
  const businessName = user?.businessName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim();

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      <AvatarBadge label={businessName} sublabel={user?.email || 'provider@mypet.app'} icon="storefront-outline" />

      {actionError ? <Notice tone="danger" icon="alert-circle" body={actionError} /> : null}

      <View style={styles.statsRow}>
        <StatTile icon="clock-outline" label="New requests" value={loading ? '—' : `${stats?.pendingCount ?? 0}`} tone="warning" />
        <StatTile icon="calendar-today" label="Today" value={loading ? '—' : `${stats?.todayCount ?? 0}`} tone="success" />
        <StatTile icon="check-circle-outline" label="Completed" value={loading ? '—' : `${stats?.completedCount ?? 0}`} tone="neutral" />
        <StatTile icon="cash-multiple" label="Revenue" value={loading ? '—' : formatMoney(stats?.revenue)} tone="neutral" />
      </View>

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : (
        <>
          {pendingBookings.length > 0 ? (
            <>
              <SectionTitle title="New requests" subtitle={`${pendingBookings.length} waiting`} />
              {pendingBookings.map((b) => (
                <InboxCard key={b.id} booking={b} onAction={handleAction} compact />
              ))}
              {(stats?.pendingCount ?? 0) > 3 ? (
                <SecondaryButton label="View all requests" icon="arrow-right" onPress={() => navigate('providerInbox')} />
              ) : null}
            </>
          ) : (
            <Notice tone="success" icon="check-circle-outline" body="No pending requests. All caught up!" />
          )}

          {todayBookings.length > 0 ? (
            <>
              <SectionTitle title="Today's schedule" subtitle={`${todayBookings.length} appointment${todayBookings.length !== 1 ? 's' : ''}`} />
              {todayBookings.map((b) => (
                <InboxCard key={b.id} booking={b} onAction={handleAction} compact />
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

// ─── Inbox ─────────────────────────────────────────────────────────────────

export function ProviderInboxScreen() {
  const { mode } = useAuth();
  const t = useT();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const next = await listProviderBookings(mode);
      setBookings(next);
    } catch (err) {
      setError(err.message || 'Unable to load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [mode]);

  async function handleAction(bookingId, status) {
    setError('');
    try {
      await updateProviderBookingStatus(mode, bookingId, status);
      await load();
    } catch (err) {
      setError(err.message || 'Action failed.');
    }
  }

  const visible = filter === 'ALL' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      <HeroTitle eyebrow="Inbox" title={t('provider_inbox_title')} subtitle={t('provider_inbox_sub')} />

      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      <View style={styles.filterRow}>
        {INBOX_FILTERS.map((f) => {
          const count = f.key === 'ALL' ? bookings.length : bookings.filter((b) => b.status === f.key).length;
          return (
            <Pill
              key={f.key}
              label={count > 0 ? `${f.label} ${count}` : f.label}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          );
        })}
      </View>

      <SectionTitle title={t('provider_results')} subtitle={loading ? t('loading') + '…' : `${visible.length}`} />

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : visible.length === 0 ? (
        <EmptyState icon="calendar-blank-outline" title="Nothing here" subtitle="No bookings match this filter." />
      ) : (
        visible.map((b) => (
          <InboxCard key={b.id} booking={b} onAction={handleAction} />
        ))
      )}
    </Screen>
  );
}

// ─── Services ──────────────────────────────────────────────────────────────

const DEMO_SERVICES_FALLBACK = [
  { id: 'svc-aster-1', title: 'Wellness visit', priceKzt: 22000, durationMin: 50, category: 'VETERINARY' },
  { id: 'svc-aster-2', title: 'Vaccination package', priceKzt: 18000, durationMin: 35, category: 'VETERINARY' },
  { id: 'svc-aster-3', title: 'Digestive consultation', priceKzt: 26000, durationMin: 60, category: 'VETERINARY' },
];

export function ProviderServicesScreen() {
  const { mode } = useAuth();
  const t = useT();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await listProviderServices(mode);
        if (result !== null) {
          console.log('[ProviderServices] Loaded', result.length, 'services from DB:', result.map(s => s.title).join(', '));
          setServices(result);
        } else {
          console.log('[ProviderServices] Demo mode — showing preview services');
          setServices(DEMO_SERVICES_FALLBACK);
        }
      } catch (err) {
        console.error('[ProviderServices] Error:', err.message);
        setError(err.message || 'Unable to load services.');
        setServices(DEMO_SERVICES_FALLBACK);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mode]);

  function startEdit(svc) {
    setEditingId(svc.id);
    setEditPrice(String(svc.priceKzt || ''));
    setEditDuration(String(svc.durationMin || ''));
    setSaved(false);
    setError('');
  }

  async function saveEdit(id) {
    setError('');
    try {
      const updated = await updateProviderService(mode, id, {
        priceKzt: Number(editPrice) || 0,
        durationMin: editDuration ? (Number(editDuration) || null) : null,
      });
      if (updated) {
        setServices(current => current.map(s => s.id === id ? { ...s, ...updated } : s));
      } else {
        setServices(current =>
          current.map(s =>
            s.id === id
              ? { ...s, priceKzt: Number(editPrice) || s.priceKzt, durationMin: Number(editDuration) || s.durationMin }
              : s
          )
        );
      }
      setEditingId('');
      setSaved(true);
    } catch (err) {
      console.error('[ProviderServices] Save error:', err.message);
      setError(err.message || 'Unable to save service.');
    }
  }

  const subtitle = loading
    ? t('loading') + '…'
    : `${services.length} service${services.length !== 1 ? 's' : ''}`;

  return (
    <Screen>
      <HeroTitle eyebrow={t('provider_services_eyebrow')} title={t('provider_services_title')} subtitle={subtitle} />

      {saved ? <Notice tone="success" icon="check-circle-outline" body={t('provider_services_saved')} /> : null}
      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      {!loading && services.length === 0 ? (
        <EmptyState icon="toolbox-outline" title={t('provider_services_empty')} subtitle={t('provider_services_empty_sub')} />
      ) : null}

      {services.map((svc) => (
        <GlassCard key={svc.id} style={styles.serviceCard}>
          <View style={styles.serviceTop}>
            <View style={styles.serviceCopy}>
              <Text style={styles.serviceTitle}>{svc.title}</Text>
              <Text style={styles.serviceMeta}>{svc.durationMin ? `${svc.durationMin} min` : 'No duration set'}</Text>
            </View>
            <Text style={styles.servicePrice}>{svc.priceKzt ? formatMoney(svc.priceKzt) : '—'}</Text>
          </View>

          {editingId === svc.id ? (
            <View style={styles.editBlock}>
              <View style={styles.editRow}>
                <View style={styles.editCell}>
                  <Field
                    label="Price (KZT)"
                    value={editPrice}
                    onChangeText={setEditPrice}
                    placeholder="22000"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.editCell}>
                  <Field
                    label="Duration (min)"
                    value={editDuration}
                    onChangeText={setEditDuration}
                    placeholder="50"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.editActions}>
                <PrimaryButton label="Save" icon="content-save-outline" onPress={() => saveEdit(svc.id)} compact />
                <SecondaryButton label="Cancel" onPress={() => setEditingId('')} style={styles.editCancel} />
              </View>
            </View>
          ) : (
            <Pressable onPress={() => startEdit(svc)} style={({ pressed }) => [styles.editTrigger, pressed ? styles.pressed : null]}>
              <MaterialCommunityIcons name="pencil-outline" size={14} color={palette.inkSoft} />
              <Text style={styles.editTriggerText}>Edit price & duration</Text>
            </Pressable>
          )}
        </GlassCard>
      ))}
    </Screen>
  );
}

// ─── Provider Profile ──────────────────────────────────────────────────────

export function ProviderProfileScreen() {
  const { apiLabel, logout, mode, preview, saveProfile, user } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    businessName: user?.businessName || '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function setField(key, value) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function handleSave() {
    setError('');
    setSaved(false);
    try {
      await saveProfile(form);
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Unable to save profile.');
    }
  }

  async function handleSwitchToCustomer() {
    try {
      await preview();
    } catch (err) {
      setError(err.message || 'Switch failed.');
    }
  }

  const businessName = form.businessName || user?.businessName || 'My Business';

  return (
    <Screen>
      <AvatarBadge
        label={businessName}
        sublabel={`${form.firstName} ${form.lastName}`.trim() || 'Provider'}
        icon="storefront-outline"
        accent={['#0F3D2E']}
      />

      <View style={styles.metricRow}>
        <StatTile icon="cellphone-marker" label={t('profile_mode')} value="Provider" tone="success" />
        <StatTile icon="lan-connect" label={t('profile_source')} value={apiLabel} tone="neutral" />
      </View>

      {saved ? <Notice tone="success" icon="check-circle-outline" body={t('profile_saved')} /> : null}
      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      <GlassCard style={styles.formPanel}>
        <SectionTitle title={t('provider_business_info')} />
        <Field label={t('provider_business_name')} value={form.businessName} onChangeText={(v) => setField('businessName', v)} placeholder="Aster Veterinary House" />
        <View style={styles.formRow}>
          <View style={styles.formCell}>
            <Field label={t('auth_first_name')} value={form.firstName} onChangeText={(v) => setField('firstName', v)} placeholder="Amina" />
          </View>
          <View style={styles.formCell}>
            <Field label={t('auth_last_name')} value={form.lastName} onChangeText={(v) => setField('lastName', v)} placeholder="Sarsen" />
          </View>
        </View>
        <Field label={t('auth_phone')} value={form.phone} onChangeText={(v) => setField('phone', v)} placeholder="+7 777 000 0000" keyboardType="phone-pad" autoCapitalize="none" />
        <PrimaryButton label={t('profile_save')} icon="content-save-outline" onPress={handleSave} />
      </GlassCard>

      <GlassCard style={styles.formPanel}>
        <SectionTitle title="Appearance" />
        <View style={[styles.preferenceRow, { borderBottomColor: p.line }]}>
          <View style={styles.preferenceLeft}>
            <Text style={[styles.preferenceLabel, { color: p.ink }]}>{t('profile_dark_mode')}</Text>
          </View>
          <ThemeToggle />
        </View>
      </GlassCard>

      <SecondaryButton label={t('provider_switch_customer')} icon="account-switch-outline" onPress={handleSwitchToCustomer} />
      <SecondaryButton label={t('profile_sign_out')} icon="logout" onPress={logout} />
    </Screen>
  );
}

// ─── Shared components ─────────────────────────────────────────────────────

function InboxCard({ booking, onAction, compact }) {
  const [declining, setDeclining] = useState(false);
  const customerName = `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim();
  const petLabel = booking.pet ? `${booking.pet.name} (${booking.pet.breed || booking.pet.species || 'pet'})` : null;

  const actionButtons = buildActionButtons(booking.status);

  return (
    <GlassCard style={[styles.inboxCard, compact ? styles.inboxCardCompact : null]}>
      <View style={styles.inboxTop}>
        <View style={styles.inboxCopy}>
          <Text style={styles.inboxCustomer}>{customerName || 'Customer'}</Text>
          {petLabel ? <Text style={styles.inboxPet}>{petLabel}</Text> : null}
          <Text style={styles.inboxService}>{booking.service?.title}</Text>
          <Text style={styles.inboxTime}>{formatDateTime(booking.scheduledAt)}</Text>
          {booking.notes ? <Text style={styles.inboxNotes}>{booking.notes}</Text> : null}
        </View>
        <View style={styles.inboxRight}>
          <StatusBadge label={relativeLabel(booking.status)} tone={STATUS_TONE[booking.status]} />
          {booking.service?.priceKzt ? (
            <Text style={styles.inboxPrice}>{formatMoney(booking.service.priceKzt)}</Text>
          ) : null}
        </View>
      </View>

      {booking.customer?.phone ? (
        <Pressable
          onPress={() => Linking.openURL(`tel:+${booking.customer.phone}`)}
          style={({ pressed }) => [styles.callBtn, pressed ? styles.pressed : null]}
        >
          <MaterialCommunityIcons name="phone-outline" size={14} color={palette.inkSoft} />
          <Text style={styles.callBtnText}>Call {booking.customer.firstName}</Text>
        </Pressable>
      ) : null}

      {declining ? (
        <View style={styles.declineBlock}>
          <Text style={styles.declineLabel}>Decline this booking?</Text>
          <View style={styles.declineActions}>
            <PrimaryButton
              label="Yes, decline"
              onPress={() => { setDeclining(false); onAction(booking.id, 'CANCELLED'); }}
              compact
              style={styles.declineConfirm}
            />
            <SecondaryButton label="Keep" onPress={() => setDeclining(false)} style={styles.declineKeep} />
          </View>
        </View>
      ) : actionButtons.length > 0 ? (
        <View style={styles.actionRow}>
          {actionButtons.map((btn) => (
            btn.secondary ? (
              <SecondaryButton
                key={btn.label}
                label={btn.label}
                icon={btn.icon}
                onPress={() => btn.label === 'Decline' ? setDeclining(true) : onAction(booking.id, btn.status)}
                style={styles.actionBtnSecondary}
              />
            ) : (
              <PrimaryButton
                key={btn.label}
                label={btn.label}
                icon={btn.icon}
                onPress={() => onAction(booking.id, btn.status)}
                compact
                style={styles.actionBtnPrimary}
              />
            )
          ))}
        </View>
      ) : null}
    </GlassCard>
  );
}

function buildActionButtons(status) {
  switch (status) {
    case 'PENDING':
      return [
        { label: 'Accept', icon: 'check', status: 'ACCEPTED', secondary: false },
        { label: 'Decline', icon: 'close', status: 'CANCELLED', secondary: true },
      ];
    case 'ACCEPTED':
      return [
        { label: 'Start visit', icon: 'play-circle-outline', status: 'IN_PROGRESS', secondary: false },
        { label: 'Cancel', icon: 'close-circle-outline', status: 'CANCELLED', secondary: true },
      ];
    case 'IN_PROGRESS':
      return [
        { label: 'Complete', icon: 'check-circle-outline', status: 'COMPLETED', secondary: false },
      ];
    default:
      return [];
  }
}

function StatTile({ icon, label, value, tone }) {
  const toneColors = {
    success: palette.success,
    warning: palette.warning,
    neutral: palette.inkSoft,
  };
  const color = toneColors[tone] || palette.inkSoft;

  return (
    <GlassCard style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
    textAlign: 'center',
  },
  statLabel: {
    color: palette.inkSoft,
    fontSize: 10,
    fontWeight: '600',
    fontFamily: typography.body,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  inboxCard: {
    gap: spacing.sm,
  },
  inboxCardCompact: {
    paddingVertical: spacing.md,
  },
  inboxTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  inboxCopy: {
    flex: 1,
    gap: 3,
  },
  inboxRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  inboxCustomer: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  inboxPet: {
    color: palette.accentDark,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  inboxService: {
    color: palette.ink,
    fontSize: 13,
    fontFamily: typography.body,
  },
  inboxTime: {
    color: palette.inkSoft,
    fontSize: 12,
    fontFamily: typography.body,
  },
  inboxNotes: {
    color: palette.inkSoft,
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: typography.body,
    marginTop: 2,
  },
  inboxPrice: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  callBtnText: {
    color: palette.inkSoft,
    fontSize: 12,
    fontFamily: typography.body,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  actionBtnPrimary: {
    flex: 1,
  },
  actionBtnSecondary: {
    flex: 1,
    minHeight: 44,
  },
  declineBlock: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  declineLabel: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  declineActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  declineConfirm: {
    flex: 1,
  },
  declineKeep: {
    flex: 1,
    minHeight: 44,
  },
  serviceCard: {
    gap: spacing.md,
  },
  serviceTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  serviceCopy: {
    flex: 1,
    gap: 2,
  },
  serviceTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  serviceMeta: {
    color: palette.inkSoft,
    fontSize: 12,
    fontFamily: typography.body,
  },
  servicePrice: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  editBlock: {
    gap: spacing.sm,
  },
  editRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editCell: {
    flex: 1,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editCancel: {
    flex: 1,
    minHeight: 44,
  },
  editTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editTriggerText: {
    color: palette.inkSoft,
    fontSize: 12,
    fontFamily: typography.body,
  },
  formPanel: {
    gap: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formCell: {
    flex: 1,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  pressed: {
    opacity: 0.92,
  },
});
