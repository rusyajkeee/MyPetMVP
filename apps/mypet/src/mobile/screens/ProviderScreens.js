import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Dimensions, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../context/LocaleContext';
import {
  createStaff,
  deleteStaff,
  getProviderAnalytics,
  getProviderProfile,
  getProviderStats,
  getVetMedicalCard,
  listMyStaff,
  listProviderBookings,
  listProviderServices,
  saveVetMedicalCard,
  updateProfile,
  updateProviderBookingStatus,
  updateProviderProfile,
  updateProviderService,
} from '../lib/api';
import { formatDateTime, formatDuration, formatMoney, relativeLabel } from '../lib/format';
import { useServiceTitle } from '../context/LocaleContext';
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
} from '../ui';
import { lightPalette, radius, spacing, typography } from '../theme';

const palette = lightPalette;

const PROVIDER_CATEGORIES = [
  { value: 'VETERINARY', labelKey: 'cat_veterinary', icon: 'stethoscope' },
  { value: 'GROOMING',   labelKey: 'cat_grooming',   icon: 'content-cut' },
  { value: 'BOARDING',   labelKey: 'cat_boarding',   icon: 'home-heart' },
  { value: 'TRAINING',   labelKey: 'cat_training',   icon: 'school-outline' },
];

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
  const [isVet, setIsVet] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [nextStats, nextBookings, profile] = await Promise.all([
        getProviderStats(mode),
        listProviderBookings(mode),
        getProviderProfile(mode),
      ]);
      setStats(nextStats);
      setBookings(nextBookings);
      setIsVet(profile?.category === 'VETERINARY');
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
                <InboxCard key={b.id} booking={b} onAction={handleAction} navigate={navigate} isVet={isVet} compact />
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
                <InboxCard key={b.id} booking={b} onAction={handleAction} navigate={navigate} isVet={isVet} compact />
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

// ─── Inbox ─────────────────────────────────────────────────────────────────

export function ProviderInboxScreen({ navigate }) {
  const { mode } = useAuth();
  const t = useT();
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isVet, setIsVet] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [next, profile] = await Promise.all([
        listProviderBookings(mode),
        getProviderProfile(mode),
      ]);
      setBookings(next);
      setIsVet(profile?.category === 'VETERINARY');
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
          <InboxCard key={b.id} booking={b} onAction={handleAction} navigate={navigate} isVet={isVet} />
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
  const svcTitle = useServiceTitle();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Staff state
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [addingStaff, setAddingStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('');
  const [staffError, setStaffError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const result = await listProviderServices(mode);
        if (result !== null) {
          setServices(result);
        } else {
          setServices(DEMO_SERVICES_FALLBACK);
        }
      } catch (err) {
        setError(err.message || 'Unable to load services.');
        setServices(DEMO_SERVICES_FALLBACK);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mode]);

  useEffect(() => {
    async function loadStaff() {
      setStaffLoading(true);
      try {
        const result = await listMyStaff(mode);
        setStaffList(result || []);
      } catch {
        setStaffList([]);
      } finally {
        setStaffLoading(false);
      }
    }
    loadStaff();
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
      setError(err.message || 'Unable to save service.');
    }
  }

  async function handleAddStaff() {
    if (!newStaffName.trim()) { setStaffError('Enter a name'); return; }
    setStaffError('');
    try {
      const member = await createStaff(mode, { name: newStaffName.trim(), role: newStaffRole.trim() || undefined });
      if (member) setStaffList(cur => [...cur, member]);
      setNewStaffName('');
      setNewStaffRole('');
      setAddingStaff(false);
    } catch (err) {
      setStaffError(err.message || 'Unable to add staff.');
    }
  }

  async function handleDeleteStaff(staffId) {
    setStaffError('');
    try {
      await deleteStaff(mode, staffId);
      setStaffList(cur => cur.filter(s => s.id !== staffId));
    } catch (err) {
      setStaffError(err.message || 'Unable to remove staff.');
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
              <Text style={styles.serviceTitle}>{svcTitle(svc.title)}</Text>
              <Text style={styles.serviceMeta}>{formatDuration(svc.durationMin) ?? 'Длительность не указана'}</Text>
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
                    label="Длительность (мин)"
                    value={editDuration}
                    onChangeText={setEditDuration}
                    placeholder="60"
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

      {/* ── Staff Management ── */}
      <SectionTitle
        title="Мастера"
        subtitle={staffLoading ? 'Загрузка…' : `${staffList.length} сотрудник${staffList.length === 1 ? '' : staffList.length < 5 ? 'а' : 'ов'}`}
      />

      {staffError ? <Notice tone="danger" icon="alert-circle" body={staffError} /> : null}

      {staffList.map((member) => (
        <GlassCard key={member.id} style={styles.staffCard}>
          <View style={styles.staffRow}>
            <View style={[styles.staffAvatar, { backgroundColor: palette.surfaceMuted }]}>
              <MaterialCommunityIcons name="account-outline" size={20} color={palette.inkSoft} />
            </View>
            <View style={styles.staffCopy}>
              <Text style={styles.staffName}>{member.name}</Text>
              {member.role ? <Text style={styles.staffRole}>{member.role}</Text> : null}
            </View>
            <Pressable
              onPress={() => handleDeleteStaff(member.id)}
              style={({ pressed }) => [styles.staffDeleteBtn, pressed && { opacity: 0.6 }]}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={palette.danger || '#EF4444'} />
            </Pressable>
          </View>
        </GlassCard>
      ))}

      {!staffLoading && staffList.length === 0 && !addingStaff ? (
        <Notice tone="neutral" icon="account-group-outline" body="Нет мастеров. Добавьте сотрудников — клиенты смогут выбрать мастера при бронировании." />
      ) : null}

      {addingStaff ? (
        <GlassCard style={styles.addStaffCard}>
          <Text style={styles.addStaffTitle}>Новый сотрудник</Text>
          <TextInput
            style={styles.staffInput}
            placeholder="Имя мастера"
            placeholderTextColor={palette.inkSoft}
            value={newStaffName}
            onChangeText={setNewStaffName}
          />
          <TextInput
            style={styles.staffInput}
            placeholder="Должность (необязательно)"
            placeholderTextColor={palette.inkSoft}
            value={newStaffRole}
            onChangeText={setNewStaffRole}
          />
          <View style={styles.editActions}>
            <PrimaryButton label="Добавить" icon="account-plus-outline" onPress={handleAddStaff} compact />
            <SecondaryButton label="Отмена" onPress={() => { setAddingStaff(false); setNewStaffName(''); setNewStaffRole(''); setStaffError(''); }} style={styles.editCancel} />
          </View>
        </GlassCard>
      ) : (
        <SecondaryButton label="Добавить мастера" icon="account-plus-outline" onPress={() => setAddingStaff(true)} />
      )}
    </Screen>
  );
}

// ─── Provider Profile ──────────────────────────────────────────────────────

export function ProviderProfileScreen() {
  const { logout, mode, saveProfile, user } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    businessName: user?.businessName || '',
    category: 'VETERINARY',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getProviderProfile(mode).then((profile) => {
      if (!active || !profile) return;
      setForm((c) => ({ ...c, category: profile.category || 'VETERINARY' }));
    }).catch(() => {});
    return () => { active = false; };
  }, [mode]);

  function setField(key, value) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function handleSave() {
    setError('');
    setSaved(false);
    try {
      const { category, businessName, ...userFields } = form;
      await saveProfile(userFields);
      await updateProviderProfile(mode, { businessName, category });
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


      {saved ? <Notice tone="success" icon="check-circle-outline" body={t('profile_saved')} /> : null}
      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      <GlassCard style={styles.formPanel}>
        <SectionTitle title={t('provider_business_info')} />
        <Field label={t('provider_business_name')} value={form.businessName} onChangeText={(v) => setField('businessName', v)} placeholder="Aster Veterinary House" />
        <SectionTitle title={t('provider_category')} />
        <View style={styles.categoryRow}>
          {PROVIDER_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              onPress={() => setField('category', cat.value)}
              style={[
                styles.categoryBtn,
                form.category === cat.value ? styles.categoryBtnActive : { borderColor: p.line },
              ]}
            >
              <MaterialCommunityIcons name={cat.icon} size={15} color={form.category === cat.value ? '#fff' : p.inkSoft} />
              <Text style={[styles.categoryBtnText, { color: form.category === cat.value ? '#fff' : p.inkSoft }]}>{t(cat.labelKey)}</Text>
            </Pressable>
          ))}
        </View>
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

      <SecondaryButton label={t('profile_sign_out')} icon="logout" onPress={logout} />
    </Screen>
  );
}

// ─── Shared components ─────────────────────────────────────────────────────

function InboxCard({ booking, onAction, navigate, isVet, compact }) {
  const t = useT();
  const svcTitle = useServiceTitle();
  const [declining, setDeclining] = useState(false);
  const customerName = `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim();
  const showMedCard = isVet && booking.petId && ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status);
  const petLabel = booking.pet ? `${booking.pet.name} (${booking.pet.breed || booking.pet.species || 'pet'})` : null;

  const actionButtons = buildActionButtons(booking.status);

  return (
    <GlassCard style={[styles.inboxCard, compact ? styles.inboxCardCompact : null]}>
      <View style={styles.inboxTop}>
        <View style={styles.inboxCopy}>
          <Text style={styles.inboxCustomer}>{customerName || 'Customer'}</Text>
          {petLabel ? <Text style={styles.inboxPet}>{petLabel}</Text> : null}
          {booking.staff ? <Text style={styles.inboxMaster}>👤 {booking.staff.name}{booking.staff.role ? ` · ${booking.staff.role}` : ''}</Text> : null}
          <Text style={styles.inboxService}>{svcTitle(booking.service?.title)}</Text>
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

      {showMedCard && navigate ? (
        <Pressable
          onPress={() => navigate('vetMedical', { bookingId: booking.id, petName: booking.pet?.name || 'Pet' })}
          style={({ pressed }) => [styles.medCardBtn, pressed ? styles.pressed : null]}
        >
          <MaterialCommunityIcons name="hospital-box-outline" size={14} color={palette.success} />
          <Text style={styles.medCardBtnText}>{t('provider_vet_medical_card')}</Text>
        </Pressable>
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

// ─── Vet Medical Card ──────────────────────────────────────────────────────

export function VetMedicalCardScreen({ route }) {
  const { mode } = useAuth();
  const t = useT();
  const bookingId = route?.params?.bookingId;
  const petName = route?.params?.petName || 'Pet';
  const [form, setForm] = useState({
    allergies: '', chronicDiseases: '', medications: '',
    vaccinations: '', pastIllnesses: '', notes: '', lastVetVisit: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingId) { setLoading(false); return; }
    getVetMedicalCard(mode, bookingId)
      .then((card) => {
        if (card) setForm({
          allergies: card.allergies || '',
          chronicDiseases: card.chronicDiseases || '',
          medications: card.medications || '',
          vaccinations: card.vaccinations || '',
          pastIllnesses: card.pastIllnesses || '',
          notes: card.notes || '',
          lastVetVisit: card.lastVetVisit ? String(card.lastVetVisit).slice(0, 10) : '',
        });
      })
      .catch((err) => setError(err.message || 'Unable to load medical card.'))
      .finally(() => setLoading(false));
  }, [mode, bookingId]);

  function setField(key, value) { setForm((c) => ({ ...c, [key]: value })); }

  async function handleSave() {
    setError(''); setSaved(false);
    try {
      await saveVetMedicalCard(mode, bookingId, {
        ...form,
        lastVetVisit: form.lastVetVisit ? new Date(`${form.lastVetVisit}T09:00:00`).toISOString() : null,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Unable to save medical card.');
    }
  }

  if (!bookingId) {
    return (
      <Screen>
        <EmptyState icon="hospital-box-outline" title="Medical card unavailable" subtitle="Booking ID is missing." />
      </Screen>
    );
  }

  return (
    <Screen>
      <HeroTitle eyebrow={t('provider_vet_medical_card')} title={petName} subtitle="Клиническая запись." />
      {saved  ? <Notice tone="success" icon="check-circle-outline" body={t('medical_saved')} /> : null}
      {error  ? <Notice tone="danger"  icon="alert-circle"         body={error} /> : null}
      {loading ? <SkeletonCard /> : (
        <GlassCard style={styles.formPanel}>
          <Field label={t('medical_allergies')}    value={form.allergies}       onChangeText={(v) => setField('allergies', v)}       placeholder="Optional" multiline />
          <Field label={t('medical_chronic')}      value={form.chronicDiseases} onChangeText={(v) => setField('chronicDiseases', v)} placeholder="Optional" multiline />
          <Field label={t('medical_medications')}  value={form.medications}     onChangeText={(v) => setField('medications', v)}     placeholder="Optional" multiline />
          <Field label={t('medical_vaccinations')} value={form.vaccinations}    onChangeText={(v) => setField('vaccinations', v)}    placeholder="Optional" multiline />
          <Field label={t('medical_past_ill')}     value={form.pastIllnesses}   onChangeText={(v) => setField('pastIllnesses', v)}   placeholder="Optional" multiline />
          <Field label={t('medical_notes')}        value={form.notes}           onChangeText={(v) => setField('notes', v)}           placeholder="Optional" multiline />
          <PrimaryButton label={t('medical_save')} icon="content-save-outline" onPress={handleSave} />
        </GlassCard>
      )}
    </Screen>
  );
}

// ─── Analytics ─────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;

const PERIODS = [
  { key: 'week',  label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'year',  label: 'Год' },
  { key: 'all',   label: 'Всё время' },
];

const STATUS_LABELS = {
  PENDING:     { label: 'Ожидают',    color: '#F59E0B' },
  ACCEPTED:    { label: 'Приняты',    color: '#10B981' },
  IN_PROGRESS: { label: 'В процессе', color: '#6366F1' },
  COMPLETED:   { label: 'Выполнено', color: '#059669' },
  CANCELLED:   { label: 'Отменено',  color: '#EF4444' },
};

export function ProviderAnalyticsScreen() {
  const { mode } = useAuth();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(isRefresh = false, p = period) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await getProviderAnalytics(mode, p);
      setData(res);
    } catch (e) {
      setError(e.message || 'Не удалось загрузить аналитику.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(false, period); }, [mode, period]);

  function handlePeriod(p) {
    setPeriod(p);
  }

  const chart = data?.revenueChart || [];
  const maxChart = Math.max(...chart.map(c => c.value), 1);
  const totalSvc = data?.topServices?.reduce((s, t) => s + t.count, 0) || 1;
  const statusEntries = Object.entries(data?.statusBreakdown || {});
  const totalStatus = statusEntries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true, period)} />}>
      <HeroTitle icon="chart-bar" title="Аналитика" subtitle="Ваши показатели" />

      {/* Period selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodRow}>
        {PERIODS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => handlePeriod(item.key)}
            style={[
              styles.periodBtn,
              period === item.key && styles.periodBtnActive,
            ]}
          >
            <Text style={[styles.periodLabel, period === item.key && styles.periodLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      {/* Big KPI tiles */}
      <View style={styles.kpiGrid}>
        <KpiTile
          icon="cash-multiple"
          label="Доход"
          value={loading ? '…' : formatMoney(data?.totalRevenue)}
          color="#059669"
        />
        <KpiTile
          icon="account-group-outline"
          label="Клиентов"
          value={loading ? '…' : String(data?.totalClients ?? 0)}
          color="#6366F1"
        />
        <KpiTile
          icon="check-circle-outline"
          label="Выполнено"
          value={loading ? '…' : String(data?.completedBookings ?? 0)}
          color="#10B981"
        />
        <KpiTile
          icon="star-outline"
          label="Рейтинг"
          value={loading ? '…' : (data?.avgRating != null ? `${data.avgRating} ★` : '—')}
          color="#F59E0B"
        />
      </View>

      {/* Revenue bar chart */}
      <GlassCard>
        <SectionTitle title="График дохода" />
        {loading ? (
          <View style={styles.chartSkeleton} />
        ) : chart.length === 0 ? (
          <Text style={styles.emptyChart}>Нет данных за период</Text>
        ) : (
          <View style={styles.chartWrap}>
            {chart.map((point, i) => {
              const pct = maxChart > 0 ? point.value / maxChart : 0;
              const barH = Math.max(pct * 120, point.value > 0 ? 4 : 2);
              return (
                <View key={i} style={styles.chartBar}>
                  <Text style={styles.chartVal}>
                    {point.value > 0 ? (point.value >= 1000 ? `${Math.round(point.value / 1000)}к` : point.value) : ''}
                  </Text>
                  <View style={[styles.chartBarFill, { height: barH, backgroundColor: point.value > 0 ? palette.success : palette.line }]} />
                  <Text style={styles.chartLabel}>{point.label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </GlassCard>

      {/* Top services */}
      {!loading && (data?.topServices?.length ?? 0) > 0 && (
        <GlassCard>
          <SectionTitle title="Популярные услуги" />
          <View style={styles.svcList}>
            {data.topServices.map((svc, i) => {
              const pct = svc.count / (data.topServices[0]?.count || 1);
              return (
                <View key={svc.id} style={styles.svcRow}>
                  <View style={styles.svcMeta}>
                    <Text style={styles.svcRank}>#{i + 1}</Text>
                    <View style={styles.svcCopy}>
                      <Text style={styles.svcTitle} numberOfLines={1}>{svc.title}</Text>
                      <Text style={styles.svcSub}>{svc.count} записей · {formatMoney(svc.revenue)}</Text>
                    </View>
                  </View>
                  <View style={styles.svcBarWrap}>
                    <View style={[styles.svcBarFill, { width: `${Math.round(pct * 100)}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </GlassCard>
      )}

      {/* Booking status breakdown */}
      {!loading && statusEntries.length > 0 && (
        <GlassCard>
          <SectionTitle title="Статусы записей" subtitle={`${data?.totalBookings ?? 0} всего`} />
          <View style={styles.statusList}>
            {statusEntries.map(([status, count]) => {
              const info = STATUS_LABELS[status] || { label: status, color: palette.inkSoft };
              const pct = count / totalStatus;
              return (
                <View key={status} style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: info.color }]} />
                  <Text style={styles.statusLabel}>{info.label}</Text>
                  <View style={styles.statusBarWrap}>
                    <View style={[styles.statusBarFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: info.color + '66' }]} />
                  </View>
                  <Text style={styles.statusCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </GlassCard>
      )}

      {loading && !data ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : null}
    </Screen>
  );
}

function KpiTile({ icon, label, value, color }) {
  return (
    <GlassCard style={styles.kpiTile}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '1A' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </GlassCard>
  );
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
  inboxMaster: {
    color: palette.inkSoft,
    fontSize: 12,
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
  medCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    marginTop: 4,
    borderRadius: radius.md,
    backgroundColor: palette.success + '15',
    alignSelf: 'flex-start',
  },
  medCardBtnText: {
    color: palette.success,
    fontSize: 12,
    fontWeight: '600',
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
  staffCard: {
    paddingVertical: spacing.sm,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffCopy: {
    flex: 1,
    gap: 2,
  },
  staffName: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  staffRole: {
    color: palette.inkSoft,
    fontSize: 12,
    fontFamily: typography.body,
  },
  staffDeleteBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addStaffCard: {
    gap: spacing.sm,
  },
  addStaffTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  staffInput: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    fontFamily: typography.body,
    color: palette.ink,
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  categoryBtnActive: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  categoryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.body,
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

  // Analytics
  periodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  periodBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: 'transparent',
  },
  periodBtnActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  periodLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.body,
    color: palette.inkSoft,
  },
  periodLabelActive: {
    color: '#fff',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiTile: {
    width: '47.5%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  kpiValue: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: '700',
    fontFamily: typography.display,
    textAlign: 'center',
  },
  kpiLabel: {
    color: palette.inkSoft,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.body,
    textAlign: 'center',
  },
  chartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 150,
    paddingTop: spacing.sm,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  chartLabel: {
    fontSize: 9,
    color: palette.inkSoft,
    fontFamily: typography.body,
    textAlign: 'center',
  },
  chartVal: {
    fontSize: 8,
    color: palette.inkSoft,
    fontFamily: typography.body,
  },
  chartSkeleton: {
    height: 140,
    borderRadius: radius.md,
    backgroundColor: palette.line,
    opacity: 0.5,
  },
  emptyChart: {
    textAlign: 'center',
    color: palette.inkSoft,
    fontSize: 13,
    fontFamily: typography.body,
    paddingVertical: spacing.xl,
  },
  svcList: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  svcRow: {
    gap: 6,
  },
  svcMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  svcRank: {
    color: palette.inkSoft,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.body,
    width: 24,
    textAlign: 'center',
  },
  svcCopy: {
    flex: 1,
    gap: 1,
  },
  svcTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  svcSub: {
    color: palette.inkSoft,
    fontSize: 12,
    fontFamily: typography.body,
  },
  svcBarWrap: {
    height: 6,
    backgroundColor: palette.line,
    borderRadius: 3,
    overflow: 'hidden',
  },
  svcBarFill: {
    height: '100%',
    backgroundColor: palette.accent,
    borderRadius: 3,
  },
  statusList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    color: palette.ink,
    fontSize: 13,
    fontFamily: typography.body,
    width: 90,
  },
  statusBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: palette.line,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusCount: {
    color: palette.inkSoft,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.body,
    width: 28,
    textAlign: 'right',
  },
});
