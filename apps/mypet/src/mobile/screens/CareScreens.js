import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale, useT, LOCALES } from '../context/LocaleContext';
import { hapticSuccess, hapticError } from '../lib/haptics';
import { addPet, deleteAllApiNotifications, fetchApiNotifications, fetchApiUnreadCount, getMedicalCard, getMyProviderApplication, getProfile, listBookings, listPets, markApiNotificationsRead, saveMedicalCard, submitProviderApplication, submitReview, updateBookingStatus } from '../lib/api';
import { clearNotifications, listNotifications, markAllRead } from '../lib/notifications';
import { formatDate, formatDateTime, initials, relativeLabel } from '../lib/format';
import { formatAgeFromBirthDate, validateMedicalCardForm, validatePetForm, validateProfileForm } from '../lib/validation';
import { PET_SPECIES, getSpeciesIcon } from '../data/petClasses';
import {
  AvatarBadge,
  DateField,
  EmptyState,
  Field,
  GlassCard,
  HeroTitle,
  Notice,
  Pill,
  PrimaryButton,
  RatingStars,
  Screen,
  SectionTitle,
  SecondaryButton,
  StatusBadge,
} from '../ui';
import { lightPalette, radius, spacing, typography } from '../theme';

const palette = lightPalette;

const bookingStatuses = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  IN_PROGRESS: 'warning',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
};

const CANCEL_REASONS = [
  'Found another provider',
  'Schedule changed',
  'Pet is unwell',
  'Too expensive',
  'Other',
];

// ─── Bookings ──────────────────────────────────────────────────────────────

export function BookingsScreen({ navigate }) {
  const { mode } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('upcoming');
  const [composerId, setComposerId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [cancellingId, setCancellingId] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  async function loadBookings(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await listBookings(mode);
      setBookings(next);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load bookings.');
      hapticError();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadBookings(); }, [mode]);

  async function handleReview(bookingId) {
    try {
      await submitReview(mode, { bookingId, rating, comment });
      hapticSuccess();
      setComposerId('');
      setComment('');
      setRating(5);
      await loadBookings();
    } catch (err) {
      setError(err.message || 'Review failed.');
    }
  }

  async function handleCancelConfirm(bookingId) {
    try {
      await updateBookingStatus(mode, bookingId, 'CANCELLED');
      hapticSuccess();
      setCancellingId('');
      setCancelReason('');
      await loadBookings();
    } catch (err) {
      setError(err.message || 'Unable to cancel booking.');
      hapticError();
    }
  }

  const upcoming = bookings.filter((b) => ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(b.status));
  const past = bookings.filter((b) => ['COMPLETED', 'CANCELLED'].includes(b.status));
  const visible = tab === 'upcoming' ? upcoming : past;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadBookings(true)} />}>
      <HeroTitle eyebrow={t('tab_bookings')} title={t('bookings_title')} subtitle={t('bookings_subtitle')} />

      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      <View style={[styles.tabRow, { backgroundColor: p.surfaceMuted }]}>
        <Pressable
          onPress={() => setTab('upcoming')}
          style={[styles.tabChip, tab === 'upcoming' && { backgroundColor: p.surface }]}
        >
          <Text style={[styles.tabChipText, { color: tab === 'upcoming' ? p.ink : p.inkSoft }]}>
            {t('bookings_upcoming')} {upcoming.length > 0 ? `(${upcoming.length})` : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('past')}
          style={[styles.tabChip, tab === 'past' && { backgroundColor: p.surface }]}
        >
          <Text style={[styles.tabChipText, { color: tab === 'past' ? p.ink : p.inkSoft }]}>
            {t('bookings_history')} {past.length > 0 ? `(${past.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {loading ? null : visible.length === 0 ? (
        <EmptyState
          icon="calendar-blank-outline"
          title={tab === 'upcoming' ? t('bookings_no_upcoming') : t('bookings_no_history')}
          subtitle={tab === 'upcoming' ? t('bookings_no_upcoming_sub') : t('bookings_no_history_sub')}
          action={tab === 'upcoming' ? (
            <PrimaryButton label={t('bookings_find_providers')} onPress={() => navigate('discover')} compact />
          ) : null}
        />
      ) : (
        visible.map((booking) => (
          <GlassCard key={booking.id} style={styles.bookingCard}>
            <View style={styles.bookingTopRow}>
              <View style={styles.bookingCopy}>
                <Text style={[styles.bookingTitle, { color: p.ink }]}>{booking.service?.title || 'Booking'}</Text>
                <Text style={[styles.bookingMeta, { color: p.inkSoft }]}>
                  {booking.provider?.businessName ||
                    `${booking.provider?.user?.firstName || ''} ${booking.provider?.user?.lastName || ''}`.trim() ||
                    'Provider'}
                </Text>
              </View>
              <StatusBadge label={relativeLabel(booking.status)} tone={bookingStatuses[booking.status]} />
            </View>

            <Text style={[styles.bookingMeta, { color: p.inkSoft }]}>{formatDateTime(booking.scheduledAt)}</Text>
            {booking.pet?.name ? (
              <Text style={[styles.bookingSubline, { color: p.inkSoft }]}>
                <Text style={[styles.bookingSublineLabel, { color: p.ink }]}>Pet: </Text>
                {booking.pet.name}
              </Text>
            ) : null}
            {booking.notes ? <Text style={[styles.bookingNote, { color: p.ink }]}>{booking.notes}</Text> : null}
            <BookingTimeline booking={booking} />

            {(booking.status === 'PENDING' || booking.status === 'ACCEPTED') ? (
              cancellingId === booking.id ? (
                <View style={[styles.cancelBlock, { borderTopColor: p.line }]}>
                  <Text style={[styles.cancelTitle, { color: p.ink }]}>{t('bookings_cancel_reason')}</Text>
                  <View style={styles.reasonRow}>
                    {CANCEL_REASONS.map((r) => (
                      <Pill
                        key={r}
                        label={r}
                        active={cancelReason === r}
                        onPress={() => setCancelReason(r)}
                        style={styles.reasonPill}
                      />
                    ))}
                  </View>
                  <View style={styles.cancelActions}>
                    <PrimaryButton
                      label={t('bookings_confirm_cancel')}
                      icon="close-circle-outline"
                      onPress={() => handleCancelConfirm(booking.id)}
                      compact
                      style={styles.cancelConfirmBtn}
                    />
                    <SecondaryButton
                      label={t('bookings_keep')}
                      onPress={() => { setCancellingId(''); setCancelReason(''); }}
                      style={styles.cancelKeepBtn}
                    />
                  </View>
                </View>
              ) : (
                <SecondaryButton
                  label={t('bookings_cancel')}
                  icon="close-circle-outline"
                  onPress={() => { setCancellingId(booking.id); setCancelReason(''); }}
                  compact
                />
              )
            ) : null}

            {booking.status === 'COMPLETED' && !booking.review ? (
              <View style={styles.reviewBlock}>
                {composerId === booking.id ? (
                  <View style={styles.reviewComposer}>
                    <View style={styles.ratingButtonRow}>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Pressable
                          key={value}
                          onPress={() => setRating(value)}
                          style={({ pressed }) => [
                            styles.ratingButton,
                            { borderColor: p.line, backgroundColor: rating >= value ? p.black : p.surfaceMuted },
                            pressed ? styles.pressed : null,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="star"
                            size={16}
                            color={rating >= value ? p.bg : p.inkSoft}
                          />
                        </Pressable>
                      ))}
                    </View>
                    <Field label="Review" value={comment} onChangeText={setComment} placeholder="Optional" multiline />
                    <PrimaryButton label={t('bookings_send_review')} icon="check" onPress={() => handleReview(booking.id)} compact />
                  </View>
                ) : (
                  <SecondaryButton label={t('bookings_leave_review')} icon="message-outline" onPress={() => setComposerId(booking.id)} />
                )}
              </View>
            ) : booking.review ? (
              <View style={styles.reviewSummary}>
                <RatingStars rating={booking.review.rating} />
                {booking.review.comment ? <Text style={[styles.reviewText, { color: p.inkSoft }]}>{booking.review.comment}</Text> : null}
              </View>
            ) : null}
          </GlassCard>
        ))
      )}
    </Screen>
  );
}

// ─── Booking Timeline (animated) ───────────────────────────────────────────

function BookingTimeline({ booking }) {
  const { palette: p } = useTheme();
  const steps = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'IN_PROGRESS', label: 'In progress' },
    { key: 'COMPLETED', label: 'Completed' },
  ];
  const order = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
  const currentIndex = order.indexOf(booking.status);

  if (booking.status === 'CANCELLED') {
    return <Text style={[styles.timelineCancelled, { color: p.danger }]}>Cancelled</Text>;
  }

  return (
    <View style={styles.timelineRow}>
      {steps.map((step, index) => {
        const done = index <= currentIndex;
        const active = index === currentIndex;
        return (
          <View key={step.key} style={styles.timelineStep}>
            <TimelineDot done={done} active={active} color={p.black} dimColor={p.line} />
            <Text style={[styles.timelineLabel, done ? { color: p.ink, fontWeight: '600' } : { color: p.inkSoft }]}>
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function TimelineDot({ done, active, color, dimColor }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.35, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  return (
    <Animated.View
      style={[
        styles.timelineDot,
        { backgroundColor: done ? color : dimColor },
        active && { width: 12, height: 12, borderRadius: 6, transform: [{ scale }] },
      ]}
    />
  );
}

// ─── Notifications ─────────────────────────────────────────────────────────

const NOTIF_ICONS = {
  BOOKING_REQUESTED: 'calendar-plus',
  BOOKING_ACCEPTED: 'calendar-check',
  BOOKING_IN_PROGRESS: 'play-circle-outline',
  BOOKING_COMPLETED: 'check-circle-outline',
  BOOKING_CANCELLED: 'close-circle-outline',
  PROVIDER_ACCEPTED: 'calendar-check',
  PROVIDER_IN_PROGRESS: 'play-circle-outline',
  PROVIDER_COMPLETED: 'check-circle-outline',
  PROVIDER_CANCELLED: 'close-circle-outline',
};

const NOTIF_TONES = {
  BOOKING_REQUESTED: '#2563eb',
  BOOKING_ACCEPTED: palette.success,
  BOOKING_COMPLETED: palette.success,
  BOOKING_CANCELLED: palette.danger,
  PROVIDER_ACCEPTED: palette.success,
  PROVIDER_COMPLETED: palette.success,
  PROVIDER_CANCELLED: palette.danger,
};

export function NotificationsScreen() {
  const { mode } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const apiList = await fetchApiNotifications(mode);
    if (apiList !== null) {
      await markApiNotificationsRead(mode);
      setNotifications(apiList);
    } else {
      const list = await listNotifications().catch(() => []);
      await markAllRead().catch(() => {});
      setNotifications(list);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, [mode]);

  async function handleClear() {
    if (mode === 'live') {
      await deleteAllApiNotifications(mode);
      setNotifications([]);
    } else {
      await clearNotifications().catch(() => {});
      setNotifications([]);
    }
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
      <HeroTitle
        eyebrow={t('tab_alerts')}
        title={t('notif_title')}
        subtitle={t('notif_subtitle')}
        action={
          notifications.length > 0 ? (
            <Pressable onPress={handleClear} style={styles.clearBtn}>
              <Text style={[styles.clearBtnText, { color: p.danger }]}>{t('notif_clear')}</Text>
            </Pressable>
          ) : null
        }
      />

      {!loading && notifications.length === 0 ? (
        <EmptyState icon="bell-outline" title={t('notif_empty')} subtitle={t('notif_empty_sub')} />
      ) : (
        notifications.map((n, idx) => {
          const color = NOTIF_TONES[n.type] || p.inkSoft;
          const icon  = NOTIF_ICONS[n.type] || 'bell-outline';
          const isUnread = !n.readAt;
          return (
            <NotifCard key={n.id} n={n} color={color} icon={icon} isUnread={isUnread} idx={idx} />
          );
        })
      )}
    </Screen>
  );
}

function NotifCard({ n, color, icon, isUnread, idx }) {
  const { palette: p } = useTheme();
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 240, delay: idx * 50, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay: idx * 50, useNativeDriver: true, tension: 90, friction: 14 }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.notifCard,
        {
          backgroundColor: isUnread ? p.surfaceTint : p.surface,
          borderColor: isUnread ? p.accentDark : p.line,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.notifIcon, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <View style={styles.notifBody}>
        <Text style={[styles.notifTitle, { color: p.ink }, isUnread && { fontWeight: '700' }]}>{n.title}</Text>
        <Text style={[styles.notifText, { color: p.inkSoft }]}>{n.body}</Text>
        <Text style={[styles.notifTime, { color: p.inkSoft }]}>{formatRelativeTime(n.createdAt)}</Text>
      </View>
      {isUnread ? <View style={[styles.unreadDot, { backgroundColor: p.accentDark }]} /> : null}
    </Animated.View>
  );
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(iso);
}

// ─── PetClassPicker ────────────────────────────────────────────────────────

function PetClassPicker({ visible, onSelect, onClose }) {
  const { palette: p } = useTheme();
  const [activeSpecies, setActiveSpecies] = useState(PET_SPECIES[0]);
  const [search, setSearch] = useState('');

  const isSearching = search.trim().length > 0;

  const breedItems = isSearching
    ? PET_SPECIES.flatMap((s) =>
        s.breeds
          .filter((b) => b.toLowerCase().includes(search.toLowerCase()))
          .map((b) => ({ breed: b, speciesLabel: s.label, speciesKey: s.key }))
      )
    : activeSpecies.breeds.map((b) => ({
        breed: b,
        speciesLabel: activeSpecies.label,
        speciesKey: activeSpecies.key,
      }));

  function handleSelect(speciesLabel, breed) {
    onSelect(speciesLabel, breed);
    setSearch('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.overlay} onPress={onClose} />
      <View style={[pickerStyles.sheet, { backgroundColor: p.bg }]}>
        <View style={[pickerStyles.handle, { backgroundColor: p.line }]} />
        <Text style={[pickerStyles.title, { color: p.ink }]}>Выберите вид и породу</Text>

        {/* Species chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={pickerStyles.speciesRow}
        >
          {PET_SPECIES.map((s) => {
            const active = !isSearching && activeSpecies.key === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => { setActiveSpecies(s); setSearch(''); }}
                style={[
                  pickerStyles.speciesChip,
                  { backgroundColor: active ? p.accent : p.surfaceMuted, borderColor: active ? p.accent : p.line },
                ]}
              >
                <MaterialCommunityIcons name={s.icon} size={16} color={active ? '#fff' : p.ink} />
                <Text style={[pickerStyles.speciesLabel, { color: active ? '#fff' : p.ink }]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search bar */}
        <View style={[pickerStyles.searchBar, { backgroundColor: p.surfaceMuted, borderColor: p.line }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={p.inkSoft} />
          <TextInput
            style={[pickerStyles.searchInput, { color: p.ink }]}
            placeholder="Поиск породы…"
            placeholderTextColor={p.inkSoft}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle-outline" size={18} color={p.inkSoft} />
            </Pressable>
          )}
        </View>

        {/* Breed list */}
        <FlatList
          data={breedItems}
          keyExtractor={(item, i) => `${item.speciesKey}_${i}`}
          keyboardShouldPersistTaps="handled"
          style={pickerStyles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelect(item.speciesLabel, item.breed)}
              style={({ pressed }) => [
                pickerStyles.breedRow,
                { borderBottomColor: p.line },
                pressed && { backgroundColor: p.surfaceMuted },
              ]}
            >
              <Text style={[pickerStyles.breedText, { color: p.ink }]}>{item.breed}</Text>
              {isSearching && (
                <Text style={[pickerStyles.breedSub, { color: p.inkSoft }]}>{item.speciesLabel}</Text>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[pickerStyles.empty, { color: p.inkSoft }]}>Ничего не найдено</Text>
          }
        />
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 16, paddingBottom: 16,
  },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:        { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  speciesRow:   { paddingBottom: 12, gap: 8, flexDirection: 'row' },
  speciesChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  speciesLabel: { fontSize: 13, fontWeight: '600' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1, marginBottom: 10,
  },
  searchInput:  { flex: 1, fontSize: 14 },
  list:         { flex: 1 },
  breedRow: {
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  breedText:    { fontSize: 15, fontWeight: '500' },
  breedSub:     { fontSize: 12 },
  empty:        { textAlign: 'center', paddingTop: 32, fontSize: 14 },
});

// ─── Pets ──────────────────────────────────────────────────────────────────

export function PetsScreen({ navigate }) {
  const { mode } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [form, setForm] = useState({
    name: '', breed: '', species: '', gender: '', birthDate: '', age: '', weight: '', color: '',
  });

  async function loadPets(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const next = await listPets(mode);
      setPets(next);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load pets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadPets(); }, [mode]);

  function setField(key, value) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function handleAddPet() {
    const validationError = validatePetForm(form);
    if (validationError) { setError(validationError); return; }
    try {
      const next = await addPet(mode, {
        ...form,
        age: form.birthDate ? formatAgeFromBirthDate(form.birthDate) : form.age,
      });
      hapticSuccess();
      setPets((c) => [next, ...c]);
      setForm({ name: '', breed: '', species: '', gender: '', birthDate: '', age: '', weight: '', color: '' });
    } catch (err) {
      setError(err.message || 'Unable to add pet.');
      hapticError();
    }
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPets(true)} />}>
      <HeroTitle eyebrow={t('tab_pets')} title={t('pets_title')} subtitle={t('pets_subtitle')} />

      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      <SectionTitle title={t('pets_list')} subtitle={`${pets.length} total`} />
      {!loading && pets.length === 0 ? (
        <EmptyState icon="paw-outline" title={t('pets_none')} subtitle={t('pets_none_sub')} />
      ) : (
        pets.map((pet) => (
          <Pressable
            key={pet.id}
            onPress={() => navigate('petDetails', { pet })}
            style={({ pressed }) => [
              styles.petCard,
              { backgroundColor: p.surface, borderColor: p.line },
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={[styles.petBadge, { backgroundColor: p.surfaceMuted }]}>
              <MaterialCommunityIcons name="paw-outline" size={20} color={p.ink} />
            </View>
            <View style={styles.petCopy}>
              <Text style={[styles.petName, { color: p.ink }]}>{pet.name}</Text>
              <Text style={[styles.petMeta, { color: p.inkSoft }]}>{pet.breed || pet.species || 'Pet profile'}</Text>
            </View>
            <StatusBadge
              label={pet.medicalCard ? t('pets_card_ready') : t('pets_no_card')}
              tone={pet.medicalCard ? 'success' : 'warning'}
            />
          </Pressable>
        ))
      )}

      <PetClassPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(species, breed) => {
          setField('species', species);
          setField('breed', breed);
        }}
      />

      <GlassCard style={styles.formPanel}>
        <SectionTitle title={t('pets_add')} subtitle="Только самое важное." />
        <Field label={t('pets_name')} value={form.name} onChangeText={(v) => setField('name', v)} placeholder="Луна" />

        {/* Species + breed picker button */}
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={({ pressed }) => [
            styles.pickerBtn,
            { backgroundColor: p.surfaceMuted, borderColor: p.line },
            pressed && { opacity: 0.75 },
          ]}
        >
          <MaterialCommunityIcons
            name={getSpeciesIcon(form.species)}
            size={22}
            color={form.species ? p.accent : p.inkSoft}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pickerBtnLabel, { color: p.inkSoft }]}>Вид и порода</Text>
            <Text style={[styles.pickerBtnValue, { color: form.species ? p.ink : p.inkSoft }]}>
              {form.species && form.breed
                ? `${form.species} · ${form.breed}`
                : 'Выбрать…'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={p.inkSoft} />
        </Pressable>

        <View style={styles.row}>
          <View style={styles.rowCell}>
            <Field label={t('pets_gender')} value={form.gender} onChangeText={(v) => setField('gender', v)} placeholder="Самка" />
          </View>
          <View style={styles.rowCell}>
            <DateField label={t('pets_birth')} value={form.birthDate} onChange={(v) => setField('birthDate', v)} maximumDate={new Date()} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.rowCell}>
            <Field label={t('pets_weight')} value={form.weight} onChangeText={(v) => setField('weight', v)} placeholder="5 кг" />
          </View>
          <View style={styles.rowCell}>
            <Field label={t('pets_color')} value={form.color} onChangeText={(v) => setField('color', v)} placeholder="Белый" />
          </View>
        </View>
        <PrimaryButton label={t('pets_save')} icon="content-save-outline" onPress={handleAddPet} />
      </GlassCard>
    </Screen>
  );
}

// ─── Pet Details ───────────────────────────────────────────────────────────

export function PetDetailsScreen({ navigate, route }) {
  const { mode } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const pet = route?.params?.pet;
  const [medicalCard, setMedicalCard] = useState(null);
  const [medicalCardError, setMedicalCardError] = useState('');

  useEffect(() => {
    let active = true;
    if (!pet?.id) return undefined;
    getMedicalCard(mode, pet.id)
      .then((card) => { if (active) setMedicalCard(card || null); })
      .catch((err) => { if (active) { setMedicalCard(null); setMedicalCardError(err.message || 'Unable to load medical data.'); } });
    return () => { active = false; };
  }, [mode, pet?.id]);

  if (!pet) {
    return (
      <Screen>
        <EmptyState icon="paw-off-outline" title="Pet not found" subtitle="Open the pet again from the list." />
      </Screen>
    );
  }

  const sublabel = [pet.breed || pet.species || 'Pet profile', pet.gender].filter(Boolean).join(' - ');
  const cardItems = buildMedicalCardItems(medicalCard);
  const ageValue = pet.birthDate ? formatAgeFromBirthDate(pet.birthDate) : pet.age || 'Not set';

  return (
    <Screen>
      <AvatarBadge label={pet.name} sublabel={sublabel} accent={['#111315']} icon="paw" />

      <View style={styles.metricGrid}>
        <MetricTile icon="cake-variant-outline" label="Age"     value={ageValue} />
        <MetricTile icon="scale-bathroom"       label="Weight"  value={pet.weight || 'Not set'} />
        <MetricTile icon="palette-outline"      label="Color"   value={pet.color || 'Not set'} />
        <MetricTile icon="dna"                  label="Species" value={pet.species || 'Not set'} />
      </View>

      <GlassCard style={styles.healthCard}>
        <SectionTitle
          title={t('medical_title')}
          subtitle={cardItems.length > 0 ? 'Saved health details.' : 'No medical data yet.'}
        />
        {medicalCardError ? <Notice tone="danger" icon="alert-circle" body={medicalCardError} /> : null}
        {cardItems.length > 0 ? (
          <View style={styles.medicalSummary}>
            {cardItems.map((item) => (
              <View key={item.label} style={[styles.medicalRow, { borderBottomColor: p.line }]}>
                <Text style={[styles.medicalLabel, { color: p.inkSoft }]}>{item.label}</Text>
                <Text style={[styles.medicalValue, { color: p.ink }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.medicalEmpty, { backgroundColor: p.surfaceMuted }]}>
            <Text style={[styles.medicalEmptyText, { color: p.inkSoft }]}>{t('medical_empty_text')}</Text>
          </View>
        )}
        <PrimaryButton
          label={cardItems.length > 0 ? t('medical_edit') : t('medical_add')}
          icon="hospital-box-outline"
          onPress={() => navigate('medical', { pet })}
          style={styles.healthButton}
        />
      </GlassCard>
    </Screen>
  );
}

// ─── Medical Card ──────────────────────────────────────────────────────────

export function MedicalCardScreen({ route }) {
  const { mode } = useAuth();
  const t = useT();
  const pet = route?.params?.pet;
  const [form, setForm] = useState({
    allergies: '', chronicDiseases: '', medications: '',
    vaccinations: '', pastIllnesses: '', notes: '', lastVetVisit: '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!pet?.id) return undefined;
    getMedicalCard(mode, pet.id)
      .then((card) => {
        if (!active || !card) return;
        setForm({
          allergies: card.allergies || '',
          chronicDiseases: card.chronicDiseases || '',
          medications: card.medications || '',
          vaccinations: card.vaccinations || '',
          pastIllnesses: card.pastIllnesses || '',
          notes: card.notes || '',
          lastVetVisit: card.lastVetVisit ? String(card.lastVetVisit).slice(0, 10) : '',
        });
      })
      .catch((err) => { if (active) setError(err.message || 'Unable to load medical card.'); });
    return () => { active = false; };
  }, [mode, pet?.id]);

  function setField(key, value) { setForm((c) => ({ ...c, [key]: value })); }

  async function handleSave() {
    const validationError = validateMedicalCardForm(form);
    if (validationError) { setError(validationError); return; }
    setError(''); setSaved(false);
    try {
      await saveMedicalCard(mode, pet.id, {
        ...form,
        lastVetVisit: form.lastVetVisit ? new Date(`${form.lastVetVisit}T09:00:00`).toISOString() : null,
      });
      hapticSuccess();
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Unable to save medical card.');
      hapticError();
    }
  }

  if (!pet) {
    return (
      <Screen>
        <EmptyState icon="hospital-box-outline" title="Medical card unavailable" subtitle="Pet profile is missing." />
      </Screen>
    );
  }

  return (
    <Screen>
      <HeroTitle eyebrow={t('medical_title')} title={pet.name} subtitle="Important health notes." />
      {saved  ? <Notice tone="success" icon="check-circle-outline" body={t('medical_saved')} /> : null}
      {error  ? <Notice tone="danger"  icon="alert-circle"         body={error}               /> : null}
      <GlassCard style={styles.formPanel}>
        <DateField label={t('medical_last_visit')} value={form.lastVetVisit} onChange={(v) => setField('lastVetVisit', v)} maximumDate={new Date()} />
        <Field label={t('medical_allergies')}    value={form.allergies}       onChangeText={(v) => setField('allergies', v)}       placeholder="Optional" multiline />
        <Field label={t('medical_chronic')}      value={form.chronicDiseases} onChangeText={(v) => setField('chronicDiseases', v)} placeholder="Optional" multiline />
        <Field label={t('medical_medications')}  value={form.medications}     onChangeText={(v) => setField('medications', v)}     placeholder="Optional" multiline />
        <Field label={t('medical_vaccinations')} value={form.vaccinations}    onChangeText={(v) => setField('vaccinations', v)}    placeholder="Optional" multiline />
        <Field label={t('medical_past_ill')}     value={form.pastIllnesses}   onChangeText={(v) => setField('pastIllnesses', v)}   placeholder="Optional" multiline />
        <Field label={t('medical_notes')}        value={form.notes}           onChangeText={(v) => setField('notes', v)}           placeholder="Optional" multiline />
        <PrimaryButton label={t('medical_save')} icon="content-save-outline" onPress={handleSave} />
      </GlassCard>
    </Screen>
  );
}

// ─── Profile ───────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { apiLabel, logout, mode, saveProfile, user } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Provider application state
  const [application, setApplication] = useState(undefined); // undefined = loading
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyForm, setApplyForm] = useState({ businessName: '', address: '', phone: '', description: '' });
  const [applyError, setApplyError] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    let active = true;
    getProfile(mode)
      .then((profile) => {
        if (!active) return;
        setForm({ firstName: profile.firstName || '', lastName: profile.lastName || '', phone: profile.phone || '' });
      })
      .catch((err) => { if (active) setError(err.message || 'Unable to load profile.'); });
    return () => { active = false; };
  }, [mode]);

  useEffect(() => {
    if (user?.role !== 'USER') { setApplication(null); return; }
    let active = true;
    getMyProviderApplication(mode)
      .then((app) => { if (active) setApplication(app); })
      .catch(() => { if (active) setApplication(null); });
    return () => { active = false; };
  }, [mode, user?.role]);

  function setField(key, value) { setForm((c) => ({ ...c, [key]: value })); }
  function setApplyField(key, value) { setApplyForm((c) => ({ ...c, [key]: value })); }

  async function handleSave() {
    const validationError = validateProfileForm(form);
    if (validationError) { setError(validationError); return; }
    setError(''); setSaved(false);
    try {
      await saveProfile(form);
      hapticSuccess();
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Unable to save profile.');
      hapticError();
    }
  }

  async function handleApplySubmit() {
    if (!applyForm.businessName.trim()) { setApplyError('Укажите название организации'); return; }
    if (!applyForm.address.trim()) { setApplyError('Укажите адрес'); return; }
    setApplyError('');
    setApplySubmitting(true);
    try {
      const result = await submitProviderApplication(mode, {
        businessName: applyForm.businessName.trim(),
        address: applyForm.address.trim(),
        phone: applyForm.phone.trim() || undefined,
        description: applyForm.description.trim() || undefined,
      });
      setApplication(result);
      setShowApplyForm(false);
      setApplySuccess(true);
      hapticSuccess();
    } catch (err) {
      setApplyError(err.message || 'Не удалось отправить заявку.');
      hapticError();
    } finally {
      setApplySubmitting(false);
    }
  }

  const label = `${form.firstName || user?.firstName || ''} ${form.lastName || user?.lastName || ''}`.trim() || 'MyPet owner';
  const isRegularUser = user?.role === 'USER';

  return (
    <Screen>
      <AvatarBadge label={label} sublabel={user?.email || 'owner@mypet.app'} initials={initials(user)} accent={['#111315']} />

      <View style={styles.metricRow}>
        <MetricTile icon="cellphone-marker" label={t('profile_mode')}   value={mode === 'demo' ? t('profile_preview') : t('profile_live')} />
        <MetricTile icon="lan-connect"      label={t('profile_source')} value={apiLabel} />
      </View>

      {saved ? <Notice tone="success" icon="check-circle-outline" body={t('profile_saved')} /> : null}
      {error ? <Notice tone="danger"  icon="alert-circle"         body={error}              /> : null}

      <GlassCard style={styles.formPanel}>
        <SectionTitle title={t('profile_title')} subtitle={t('profile_subtitle')} />
        <Field label={t('auth_first_name')} value={form.firstName} onChangeText={(v) => setField('firstName', v)} placeholder="Aruzhan" />
        <Field label={t('auth_last_name')}  value={form.lastName}  onChangeText={(v) => setField('lastName', v)}  placeholder="Bektas" />
        <Field label={t('auth_phone')}      value={form.phone}     onChangeText={(v) => setField('phone', v)}     placeholder="+7 777 000 0000" keyboardType="phone-pad" autoCapitalize="none" />
        <PrimaryButton label={t('profile_save')} icon="content-save-outline" onPress={handleSave} />
        <SecondaryButton label={t('profile_sign_out')} icon="logout" onPress={logout} />
      </GlassCard>

      {/* Become a Provider section */}
      {isRegularUser && mode === 'live' ? (
        <GlassCard style={styles.formPanel}>
          <SectionTitle title="Стать партнёром" subtitle="Зарегистрируйте свою организацию" />

          {applySuccess && !application ? (
            <Notice tone="success" icon="check-circle-outline" body="Заявка отправлена! Ожидайте проверки администратором." />
          ) : null}

          {application === undefined ? (
            <Notice tone="neutral" icon="timer-sand" body="Загрузка…" />
          ) : application?.status === 'PENDING' ? (
            <View style={styles.appStatusBlock}>
              <View style={[styles.appStatusDot, { backgroundColor: '#F2A93B' }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.appStatusTitle, { color: p.ink }]}>Заявка на рассмотрении</Text>
                <Text style={[styles.appStatusSub, { color: p.inkSoft }]}>{application.businessName} · {application.address}</Text>
              </View>
            </View>
          ) : application?.status === 'REJECTED' ? (
            <>
              <View style={styles.appStatusBlock}>
                <View style={[styles.appStatusDot, { backgroundColor: palette.danger }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.appStatusTitle, { color: p.ink }]}>Заявка отклонена</Text>
                  {application.adminNote ? (
                    <Text style={[styles.appStatusSub, { color: p.inkSoft }]}>{application.adminNote}</Text>
                  ) : null}
                </View>
              </View>
              {!showApplyForm ? (
                <SecondaryButton label="Подать заново" icon="refresh" onPress={() => {
                  setApplyForm({ businessName: application.businessName || '', address: application.address || '', phone: application.phone || '', description: application.description || '' });
                  setApplyError('');
                  setShowApplyForm(true);
                }} />
              ) : null}
            </>
          ) : !application && !showApplyForm ? (
            <SecondaryButton label="Подать заявку" icon="storefront-outline" onPress={() => { setShowApplyForm(true); setApplyError(''); }} />
          ) : null}

          {showApplyForm ? (
            <View style={styles.applyForm}>
              {applyError ? <Notice tone="danger" icon="alert-circle" body={applyError} /> : null}
              <Field
                label="Название организации *"
                value={applyForm.businessName}
                onChangeText={(v) => setApplyField('businessName', v)}
                placeholder="ООО Veterinary House"
              />
              <Field
                label="Адрес *"
                value={applyForm.address}
                onChangeText={(v) => setApplyField('address', v)}
                placeholder="г. Астана, ул. Кенесары 40"
              />
              <Field
                label="Телефон"
                value={applyForm.phone}
                onChangeText={(v) => setApplyField('phone', v)}
                placeholder="+7 777 000 0000"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
              <Field
                label="Описание (необязательно)"
                value={applyForm.description}
                onChangeText={(v) => setApplyField('description', v)}
                placeholder="Кратко о вашей организации и услугах"
                multiline
              />
              <View style={styles.applyActions}>
                <PrimaryButton
                  label={applySubmitting ? 'Отправка…' : 'Отправить заявку'}
                  icon="send-outline"
                  onPress={handleApplySubmit}
                  disabled={applySubmitting}
                />
                <SecondaryButton label="Отмена" onPress={() => { setShowApplyForm(false); setApplyError(''); }} />
              </View>
            </View>
          ) : null}
        </GlassCard>
      ) : null}

      <GlassCard style={styles.formPanel}>
        <SectionTitle title="Appearance" />
        <LanguagePicker />
      </GlassCard>
    </Screen>
  );
}

function LanguagePicker() {
  const { palette: p } = useTheme();
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <View style={styles.preferenceRow}>
      <View style={styles.preferenceLeft}>
        <MaterialCommunityIcons name="translate" size={18} color={p.ink} />
        <Text style={[styles.preferenceLabel, { color: p.ink }]}>{t('profile_language')}</Text>
      </View>
      <View style={styles.langRow}>
        {LOCALES.map((l) => (
          <Pressable
            key={l.code}
            onPress={() => setLocale(l.code)}
            style={[
              styles.langBtn,
              { borderColor: locale === l.code ? p.accent : p.line, backgroundColor: locale === l.code ? p.accentMuted : p.surface },
            ]}
          >
            <Text style={[styles.langBtnText, { color: locale === l.code ? p.accentDark : p.inkSoft }]}>{l.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function MetricTile({ icon, label, value }) {
  const { palette: p } = useTheme();
  return (
    <GlassCard style={styles.metricTile}>
      <View style={[styles.metricIcon, { backgroundColor: p.surfaceMuted }]}>
        <MaterialCommunityIcons name={icon} size={18} color={p.ink} />
      </View>
      <Text style={[styles.metricLabel, { color: p.inkSoft }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: p.ink }]}>{value}</Text>
    </GlassCard>
  );
}

function buildMedicalCardItems(card) {
  if (!card) return [];
  return [
    { label: 'Last vet visit',      value: card.lastVetVisit ? formatDate(card.lastVetVisit) : '' },
    { label: 'Allergies',           value: card.allergies },
    { label: 'Chronic conditions',  value: card.chronicDiseases },
    { label: 'Medications',         value: card.medications },
    { label: 'Vaccinations',        value: card.vaccinations },
    { label: 'Past illnesses',      value: card.pastIllnesses },
    { label: 'Notes',               value: card.notes },
  ].filter((item) => item.value && String(item.value).trim());
}

// ─── StyleSheet ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: palette.surfaceMuted,
    borderRadius: radius.lg,
    padding: 4,
  },
  tabChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  bookingCard: {
    gap: spacing.sm,
  },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  bookingCopy: {
    flex: 1,
    gap: 2,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  bookingMeta: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
  },
  bookingSubline: {
    fontSize: 13,
    fontFamily: typography.body,
  },
  bookingSublineLabel: {
    fontWeight: '600',
  },
  bookingNote: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
  },
  cancelBlock: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    marginTop: spacing.xs,
  },
  cancelTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  reasonPill: {
    minHeight: 34,
    paddingHorizontal: spacing.sm,
  },
  cancelActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelConfirmBtn: { flex: 1 },
  cancelKeepBtn: { flex: 1, minHeight: 44 },
  reviewBlock: {
    paddingTop: spacing.xs,
  },
  reviewComposer: {
    gap: spacing.sm,
  },
  ratingButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  reviewSummary: {
    gap: 8,
    paddingTop: spacing.xs,
  },
  reviewText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: spacing.xs,
  },
  timelineStep: {
    alignItems: 'center',
    flex: 1,
    gap: 5,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLabel: {
    fontSize: 10,
    fontFamily: typography.body,
  },
  timelineCancelled: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  notifCard: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifBody: {
    flex: 1,
    gap: 3,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  notifText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
  },
  notifTime: {
    fontSize: 11,
    fontFamily: typography.body,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
  petCard: {
    minHeight: 76,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  petBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petCopy: {
    flex: 1,
    gap: 2,
  },
  petName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  petMeta: {
    fontSize: 13,
    fontFamily: typography.body,
  },
  formPanel: {
    gap: spacing.md,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  pickerBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pickerBtnValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowCell: {
    flex: 1,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  healthCard: {
    gap: spacing.md,
  },
  medicalSummary: {
    gap: spacing.sm,
  },
  medicalRow: {
    gap: 4,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  medicalLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  medicalValue: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
  },
  medicalEmpty: {
    padding: spacing.md,
    borderRadius: radius.md,
  },
  medicalEmptyText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
  },
  healthButton: {
    minHeight: 60,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricTile: {
    flex: 1,
    gap: 8,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 100,
  },
  preferenceLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.body,
    flexShrink: 1,
  },
  langRow: {
    flexDirection: 'row',
    gap: 6,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  pressed: {
    opacity: 0.92,
  },
  appStatusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  appStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  appStatusTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  appStatusSub: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: typography.body,
  },
  applyForm: {
    gap: spacing.md,
  },
  applyActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
