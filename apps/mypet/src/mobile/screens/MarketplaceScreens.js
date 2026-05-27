import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import ProvidersMap from '../components/ProvidersMap';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useT } from '../context/LocaleContext';
import {
  createBooking,
  getCategories,
  getProviderDetails,
  getProviderSlots,
  listBookings,
  listFavoriteProviderIds,
  listNearbyProviders,
  listPets,
  listProviders,
  searchServices,
  toggleFavoriteProvider,
} from '../lib/api';
import { formatDate, formatDateTime, formatDuration, formatMoney, relativeLabel } from '../lib/format';
import { hapticLight, hapticSelection } from '../lib/haptics';
import {
  AvatarBadge,
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
  SkeletonCard,
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

// ─── HomeScreen ──────────────────────────────────────────────────────────────

const CAT_DARK = {
  VETERINARY: { bg: 'rgba(74,222,128,0.10)',  icon: '#4ADE80' },
  GROOMING:   { bg: 'rgba(201,139,118,0.12)', icon: '#C98B76' },
  BOARDING:   { bg: 'rgba(201,164,86,0.12)',  icon: '#C9A456' },
  TRAINING:   { bg: 'rgba(88,116,184,0.14)',  icon: '#7B9FE8' },
  SHELTER:    { bg: 'rgba(248,113,113,0.10)', icon: '#F87171' },
};

export function HomeScreen({ navigate, unreadCount = 0 }) {
  const { mode, user } = useAuth();
  const { palette: p, dark } = useTheme();
  const t = useT();
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    Promise.all([listProviders(), listBookings(mode)])
      .then(([nextProviders, nextBookings]) => {
        setProviders(nextProviders.slice(0, 3));
        setBookings(nextBookings.slice(0, 1));
      })
      .catch(() => {
        setProviders([]);
        setBookings([]);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }

  useEffect(() => { load(); }, [mode]);

  const nextBooking = bookings[0];

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={p.ink} />}>
      <HeroTitle
        eyebrow={t('home_eyebrow')}
        title={`${t('home_hi')}, ${user?.firstName || 'there'}`}
        subtitle={t('home_subtitle')}
        trailing={
          <Pressable
            onPress={() => navigate('notifications')}
            style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.7 }]}
          >
            <MaterialCommunityIcons name="bell-outline" size={26} color={p.ink} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        }
      />

      {nextBooking ? (
        <GlassCard style={styles.bookingBanner}>
          <View style={styles.bookingBannerRow}>
            <View style={styles.bookingBannerCopy}>
              <Text style={[styles.bookingBannerTitle, { color: p.ink }]}>{nextBooking.service?.title}</Text>
              <Text style={[styles.bookingBannerMeta, { color: p.inkSoft }]}>{formatDateTime(nextBooking.scheduledAt)}</Text>
            </View>
            <StatusBadge label={relativeLabel(nextBooking.status)} tone={bookingStatuses[nextBooking.status]} />
          </View>
        </GlassCard>
      ) : null}

      <SectionTitle title={t('home_services')} />
      <View style={styles.grid}>
        {getCategories().map((category) => {
          const catAccent = dark ? CAT_DARK[category.slug] : null;
          return (
            <Pressable
              key={category.slug}
              onPress={() => { hapticSelection(); navigate('discover', { category: category.slug }); }}
              style={({ pressed }) => [
                styles.shortcutCard,
                { backgroundColor: p.surface, borderColor: catAccent ? catAccent.bg : p.line },
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={[styles.shortcutIcon, { backgroundColor: catAccent ? catAccent.bg : p.surfaceMuted }]}>
                <MaterialCommunityIcons name={category.icon} size={20} color={catAccent ? catAccent.icon : p.ink} />
              </View>
              <Text style={[styles.shortcutLabel, { color: catAccent ? catAccent.icon : p.ink }]}>
                {t(`cat_${category.slug.toLowerCase()}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle
        title={t('home_nearby')}
        subtitle={loading ? t('loading') : undefined}
        trailing={
          <SecondaryButton
            label={t('home_map')}
            icon="map-search-outline"
            onPress={() => navigate('nearby')}
            style={styles.trailingButton}
          />
        }
      />

      {providers.length === 0 && !loading ? (
        <EmptyState
          icon="storefront-outline"
          title={t('home_no_providers')}
          subtitle={t('home_no_providers_sub')}
          action={<PrimaryButton label={t('home_open_catalog')} onPress={() => navigate('discover')} compact />}
        />
      ) : (
        providers.map((provider) => (
          <ProviderListItem
            key={provider.id}
            provider={provider}
            onPress={() => navigate('provider', { providerId: provider.id })}
          />
        ))
      )}
    </Screen>
  );
}

// ─── NearbyServicesScreen ─────────────────────────────────────────────────────

const RADIUS_OPTIONS = [1, 3, 5, 10];
const ASTANA = { latitude: 51.18, longitude: 71.446 };
const CATEGORY_COLORS = {
  VETERINARY: '#2563eb',
  GROOMING: '#16a34a',
  BOARDING: '#ea580c',
  TRAINING: '#7c3aed',
  SHELTER: '#dc2626',
};

export function NearbyServicesScreen({ navigate }) {
  const { palette: p, dark } = useTheme();
  const t = useT();
  const [category, setCategory] = useState(getCategories()[0].slug);
  const [radiusKm, setRadiusKm] = useState(5);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topRated, setTopRated] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [userCoords, setUserCoords] = useState(ASTANA);
  useEffect(() => {
    let active = true;

    async function loadNearby() {
      setLoading(true);
      let coords = { lat: null, lng: null };

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (active) setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        }
      } catch {
        // falls back to Astana center
      }

      const items = await listNearbyProviders({ ...coords, radius: radiusKm, category, topRated });
      if (!active) return;
      setProviders(items);
      setLoading(false);
    }

    loadNearby().catch(() => {
      if (!active) return;
      setProviders([]);
      setLoading(false);
    });

    return () => { active = false; };
  }, [category, radiusKm, topRated]);

  const catColor = CATEGORY_COLORS[category] || '#16a34a';
  const activeToggleBg = dark ? '#E6EDF3' : '#111318';
  const activeToggleText = dark ? '#111318' : '#fff';

  return (
    <Screen scrollable={viewMode === 'list'}>
      <HeroTitle eyebrow={t('nearby_eyebrow')} title={t('nearby_title')} subtitle={t('nearby_subtitle')} />

      <View style={[styles.viewToggle, { backgroundColor: p.surfaceMuted }]}>
        <Pressable
          onPress={() => { hapticSelection(); setViewMode('list'); }}
          style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: activeToggleBg }]}
        >
          <MaterialCommunityIcons
            name="format-list-bulleted"
            size={16}
            color={viewMode === 'list' ? activeToggleText : p.ink}
          />
          <Text style={[styles.toggleLabel, { color: viewMode === 'list' ? activeToggleText : p.ink }]}>
            {t('nearby_list')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { hapticSelection(); setViewMode('map'); }}
          style={[styles.toggleBtn, viewMode === 'map' && { backgroundColor: activeToggleBg }]}
        >
          <MaterialCommunityIcons
            name="map-outline"
            size={16}
            color={viewMode === 'map' ? activeToggleText : p.ink}
          />
          <Text style={[styles.toggleLabel, { color: viewMode === 'map' ? activeToggleText : p.ink }]}>
            {t('nearby_map')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.pillWrap}>
        {getCategories().map((item) => (
          <Pill
            key={item.slug}
            label={t(`cat_${item.slug.toLowerCase()}`)}
            active={category === item.slug}
            onPress={() => setCategory(item.slug)}
          />
        ))}
      </View>

      <View style={styles.pillWrap}>
        {RADIUS_OPTIONS.map((value) => (
          <Pill key={value} label={`${value} km`} active={radiusKm === value} onPress={() => setRadiusKm(value)} />
        ))}
        <Pill label={t('nearby_top_rated')} active={topRated} onPress={() => setTopRated((v) => !v)} />
      </View>

      {viewMode === 'map' ? (
        <ProvidersMap
          providers={providers}
          userCoords={userCoords}
          radiusKm={radiusKm}
          catColor={catColor}
          loading={loading}
          onProviderPress={(id) => navigate('provider', { providerId: id })}
          badge={loading ? '...' : `${providers.length} ${t('nearby_places_count')}`}
          mapLoadingText={t('nearby_searching')}
          openProfileText={t('nearby_open_profile')}
        />
      ) : (
        <>
          <SectionTitle
            title={t('nearby_results')}
            subtitle={loading ? t('nearby_results_loading') : `${providers.length}`}
          />
          {providers.length === 0 && !loading ? (
            <EmptyState icon="map-search-outline" title={t('nearby_empty')} subtitle={t('nearby_empty_sub')} />
          ) : (
            providers.map((provider) => (
              <ProviderListItem
                key={provider.id}
                provider={provider}
                onPress={() => navigate('provider', { providerId: provider.id })}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

// ─── DiscoverScreen ───────────────────────────────────────────────────────────

function ServiceSearchItem({ item, onPress, p, t }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.serviceCard, { backgroundColor: p.surface, borderColor: p.line }, pressed ? styles.pressed : null]}
    >
      <View style={styles.serviceCardTop}>
        <Text style={[styles.serviceCardTitle, { color: p.ink }]} numberOfLines={1}>{item.title}</Text>
        {item.priceKzt ? (
          <Text style={[styles.serviceCardPrice, { color: p.accent }]}>{item.priceKzt.toLocaleString()} ₸</Text>
        ) : null}
      </View>
      <Text style={[styles.serviceCardProvider, { color: p.inkSoft }]} numberOfLines={1}>
        {t('search_at')} {item.provider.businessName}
      </Text>
      <View style={styles.serviceCardMeta}>
        {item.provider.avgRating ? (
          <View style={styles.serviceCardMetaItem}>
            <MaterialCommunityIcons name="star" size={13} color="#F2A93B" />
            <Text style={[styles.serviceCardMetaText, { color: p.inkSoft }]}>{item.provider.avgRating.toFixed(1)}</Text>
          </View>
        ) : null}
        {item.provider.distanceKm != null ? (
          <View style={styles.serviceCardMetaItem}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color={p.inkSoft} />
            <Text style={[styles.serviceCardMetaText, { color: p.inkSoft }]}>{item.provider.distanceKm} km</Text>
          </View>
        ) : null}
        {item.durationMin ? (
          <View style={styles.serviceCardMetaItem}>
            <MaterialCommunityIcons name="clock-outline" size={13} color={p.inkSoft} />
            <Text style={[styles.serviceCardMetaText, { color: p.inkSoft }]}>{formatDuration(item.durationMin)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function DiscoverScreen({ navigate, route }) {
  const { mode } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const initialSlug = route?.params?.category;
  const [selectedCats, setSelectedCats] = useState(() => initialSlug ? new Set([initialSlug]) : new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [allProviders, setAllProviders] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    Promise.all([listProviders(), listFavoriteProviderIds(mode)])
      .then(([provs, favIds]) => {
        setAllProviders(provs);
        setFavoriteIds(new Set(Array.isArray(favIds) ? favIds : []));
      })
      .catch(() => setAllProviders([]))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }

  useEffect(() => { load(); }, [mode]);

  function handleSearchChange(text) {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const results = await searchServices(mode, text.trim(), null);
      setSearchResults(results);
      setSearching(false);
    }, 400);
  }

  function toggleCategory(slug) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const isSearching = searchQuery.trim().length >= 2;

  const providers = allProviders.filter((prov) => {
    if (showFavorites && !favoriteIds.has(prov.id)) return false;
    if (selectedCats.size > 0 && !selectedCats.has(prov.category)) return false;
    return true;
  });

  return (
    <Screen refreshControl={!isSearching ? <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={p.ink} /> : undefined}>
      <HeroTitle eyebrow={t('discover_eyebrow')} title={t('discover_find')} />

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: p.surface, borderColor: p.line }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={p.inkSoft} />
        <TextInput
          style={[styles.searchInput, { color: p.ink }]}
          placeholder={t('search_placeholder')}
          placeholderTextColor={p.inkSoft}
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
            <MaterialCommunityIcons name="close-circle" size={18} color={p.inkSoft} />
          </Pressable>
        ) : null}
      </View>

      {isSearching ? (
        <>
          <SectionTitle
            title={t('search_results')}
            subtitle={searching ? t('loading') : `${searchResults.length}`}
          />
          {searching ? (
            <SkeletonCard />
          ) : searchResults.length === 0 ? (
            <EmptyState icon="magnify-close" title={t('search_empty')} subtitle={t('search_empty_sub')} />
          ) : (
            searchResults.map((item) => (
              <ServiceSearchItem
                key={item.id}
                item={item}
                p={p}
                t={t}
                onPress={() => navigate('provider', { providerId: item.provider.id })}
              />
            ))
          )}
        </>
      ) : (
        <>
          <View style={styles.pillWrap}>
            {getCategories().map((item) => (
              <Pill
                key={item.slug}
                label={t(`cat_${item.slug.toLowerCase()}`)}
                icon={item.icon}
                active={selectedCats.has(item.slug)}
                onPress={() => toggleCategory(item.slug)}
              />
            ))}
            <Pill
              label={t('discover_favorites')}
              icon={showFavorites ? 'heart' : 'heart-outline'}
              active={showFavorites}
              onPress={() => setShowFavorites((v) => !v)}
            />
          </View>

          <SectionTitle title={t('discover_results')} subtitle={loading ? t('loading') : `${providers.length}`} />

          {providers.length === 0 && !loading ? (
            <EmptyState icon="map-search-outline" title={t('discover_empty')} subtitle={t('discover_empty_sub')} />
          ) : (
            providers.map((provider) => (
              <ProviderListItem
                key={provider.id}
                provider={provider}
                onPress={() => navigate('provider', { providerId: provider.id })}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

// ─── ProviderScreen ───────────────────────────────────────────────────────────

export function ProviderScreen({ navigate, route }) {
  const { mode } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const providerId = route?.params?.providerId;
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let active = true;
    getProviderDetails(providerId)
      .then((v) => { if (active) setProvider(v); })
      .catch((e) => { if (active) setError(e.message || 'Provider error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [providerId]);

  useEffect(() => {
    let active = true;
    listFavoriteProviderIds(mode)
      .then((ids) => { if (active) setFavorite(Array.isArray(ids) && ids.includes(providerId)); })
      .catch(() => { if (active) setFavorite(false); });
    return () => { active = false; };
  }, [mode, providerId]);

  async function handleToggleFavorite() {
    try {
      await toggleFavoriteProvider(mode, providerId, !favorite);
      setFavorite((c) => !c);
    } catch (e) {
      setError(e.message || 'Unable to update favorites');
    }
  }

  if (loading) {
    return (
      <Screen>
        <GlassCard>
          <Text style={[styles.loadingText, { color: p.inkSoft }]}>{t('loading')}</Text>
        </GlassCard>
      </Screen>
    );
  }

  if (!provider) {
    return (
      <Screen>
        <EmptyState
          icon="account-search-outline"
          title={t('provider_not_found')}
          subtitle={error || t('provider_not_found_sub')}
          action={<PrimaryButton label={t('back')} onPress={() => navigate('discover')} compact />}
        />
      </Screen>
    );
  }

  const name = provider.businessName || `${provider.user?.firstName} ${provider.user?.lastName}`;

  return (
    <Screen>
      <AvatarBadge label={name} sublabel={provider.address || t('provider_nearby')} icon="paw" />
      <SecondaryButton
        label={favorite ? t('provider_saved_fav') : t('provider_save_fav')}
        icon={favorite ? 'heart' : 'heart-outline'}
        onPress={handleToggleFavorite}
      />

      <View style={styles.metaRow}>
        <MetricTile
          icon="star-outline"
          label={t('provider_rating')}
          value={provider.avgRating ? provider.avgRating.toFixed(1) : t('provider_new')}
        />
        <MetricTile
          icon="message-reply-outline"
          label={t('provider_reviews_label')}
          value={`${provider.reviewCount || 0}`}
        />
      </View>

      <SectionTitle title={t('provider_services_label')} />
      {provider.services?.map((service) => (
        <GlassCard key={service.id} style={styles.serviceRow}>
          <View style={styles.serviceCopy}>
            <Text style={[styles.serviceTitle, { color: p.ink }]}>{service.title}</Text>
            <Text style={[styles.serviceMeta, { color: p.inkSoft }]}>
              {service.durationMin ? formatDuration(service.durationMin) : t('provider_open')}
            </Text>
          </View>
          <Text style={[styles.servicePrice, { color: p.ink }]}>{formatMoney(service.priceKzt)}</Text>
        </GlassCard>
      ))}

      {(provider.reviews || []).length > 0 ? (
        <>
          <SectionTitle title={t('provider_reviews_label')} />
          {provider.reviews.slice(0, 2).map((review) => (
            <GlassCard key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={[styles.reviewAuthor, { color: p.ink }]}>
                  {review.user?.firstName} {review.user?.lastName}
                </Text>
                <RatingStars rating={review.rating} />
              </View>
              {review.comment ? (
                <Text style={[styles.reviewBody, { color: p.inkSoft }]}>{review.comment}</Text>
              ) : null}
            </GlassCard>
          ))}
        </>
      ) : null}

      <PrimaryButton label={t('provider_book')} icon="calendar-check-outline" onPress={() => navigate('booking', { providerId })} />
    </Screen>
  );
}

// ─── BookingScreen ────────────────────────────────────────────────────────────

export function BookingScreen({ navigate, route }) {
  const { mode } = useAuth();
  const { palette: p } = useTheme();
  const t = useT();
  const providerId = route?.params?.providerId;
  const [provider, setProvider] = useState(null);
  const [pets, setPets] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = makeDayValues();
    return days[1] || days[0];
  });
  const [selectedTime, setSelectedTime] = useState('11:00');
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getProviderDetails(providerId), listPets(mode)])
      .then(([nextProvider, nextPets]) => {
        if (!active) return;
        setProvider(nextProvider);
        setPets(nextPets);
        setSelectedServiceId(nextProvider.services?.[0]?.id || '');
        setSelectedPetId(nextPets[0]?.id || '');
      })
      .catch((e) => { if (active) setError(e.message || 'Booking error'); });
    return () => { active = false; };
  }, [mode, providerId]);

  useEffect(() => {
    if (!providerId || !selectedDay) return;
    let active = true;
    setSlotsLoading(true);
    getProviderSlots(mode, providerId, selectedDay)
      .then((nextSlots) => {
        if (!active) return;
        setSlots(nextSlots);
        const availableSlot = nextSlots.find((s) => s.available);
        if (availableSlot && !nextSlots.find((s) => s.time === selectedTime && s.available)) {
          setSelectedTime(availableSlot.time);
        }
      })
      .catch(() => { if (active) setSlots([]); })
      .finally(() => { if (active) setSlotsLoading(false); });
    return () => { active = false; };
  }, [mode, providerId, selectedDay]);

  function handleReview() {
    if (!selectedServiceId) { setError(t('booking_choose_service')); return; }
    setError('');
    setStep('confirm');
  }

  async function handleConfirm() {
    setError('');
    setSubmitting(true);
    try {
      hapticLight();
      const scheduledAt = `${selectedDay}T${selectedTime}:00.000+05:00`;
      await createBooking(mode, {
        serviceId: selectedServiceId,
        petId: selectedPetId || undefined,
        scheduledAt,
        notes: notes.trim() || undefined,
        _providerSnapshot: provider,
      });
      setStep('done');
    } catch (e) {
      setError(e.message || 'Booking failed');
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  }

  if (!provider) {
    return (
      <Screen>
        <EmptyState
          icon="calendar-remove-outline"
          title={t('booking_unavailable')}
          subtitle={error || t('booking_try_again')}
        />
      </Screen>
    );
  }

  const days = dayOptions(t);
  const selectedService = provider.services?.find((s) => s.id === selectedServiceId);
  const selectedPet = pets.find((pet) => pet.id === selectedPetId);
  const dayLabel = days.find((d) => d.value === selectedDay)?.label || selectedDay;

  if (step === 'done') {
    return (
      <Screen>
        <View style={styles.doneBlock}>
          <View style={[styles.doneIcon, { backgroundColor: p.surfaceTint }]}>
            <MaterialCommunityIcons name="check-circle" size={48} color={p.success} />
          </View>
          <Text style={[styles.doneTitle, { color: p.ink }]}>{t('booking_done_title')}</Text>
          <Text style={[styles.doneSub, { color: p.inkSoft }]}>{t('booking_done_sub')}</Text>
        </View>
        <GlassCard style={styles.doneSummary}>
          <SummaryRow icon="store-outline" label={t('booking_provider_label')} value={provider.businessName} />
          <SummaryRow icon="tag-outline" label={t('booking_service_label')} value={selectedService?.title} />
          <SummaryRow icon="calendar-outline" label={t('booking_date_label')} value={`${dayLabel} ${selectedTime}`} />
          {selectedPet ? <SummaryRow icon="paw-outline" label={t('booking_pet_label')} value={selectedPet.name} /> : null}
        </GlassCard>
        <PrimaryButton label={t('booking_view_bookings')} icon="calendar-check-outline" onPress={() => navigate('bookings')} />
      </Screen>
    );
  }

  if (step === 'confirm') {
    return (
      <Screen>
        <HeroTitle
          eyebrow={t('booking_confirm_eyebrow')}
          title={t('booking_confirm_title')}
          subtitle={t('booking_confirm_sub')}
        />
        {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}
        <GlassCard style={styles.confirmCard}>
          <SummaryRow icon="store-outline" label={t('booking_provider_label')} value={provider.businessName} />
          <SummaryRow icon="tag-outline" label={t('booking_service_label')} value={selectedService?.title} />
          {selectedService?.priceKzt ? (
            <SummaryRow icon="cash-outline" label={t('booking_price_label')} value={formatMoney(selectedService.priceKzt)} />
          ) : null}
          {selectedService?.durationMin ? (
            <SummaryRow icon="clock-outline" label={t('booking_duration_label')} value={formatDuration(selectedService.durationMin)} />
          ) : null}
          <SummaryRow icon="calendar-outline" label={t('booking_date_label')} value={`${dayLabel} ${selectedTime}`} />
          {selectedPet ? (
            <SummaryRow
              icon="paw-outline"
              label={t('booking_pet_label')}
              value={`${selectedPet.name} (${selectedPet.breed || selectedPet.species || 'pet'})`}
            />
          ) : null}
          {notes.trim() ? <SummaryRow icon="note-text-outline" label={t('booking_notes_label')} value={notes.trim()} /> : null}
        </GlassCard>
        <PrimaryButton
          label={submitting ? t('booking_submitting') : t('booking_confirm_btn')}
          icon="calendar-check-outline"
          onPress={handleConfirm}
          disabled={submitting}
        />
        <SecondaryButton label={t('booking_edit')} icon="pencil-outline" onPress={() => setStep('form')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <HeroTitle eyebrow={t('booking_eyebrow')} title={provider.businessName || t('booking_new')} />
      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      <SectionTitle title={t('booking_service')} />
      <View style={styles.stack}>
        {provider.services?.map((service) => {
          const active = service.id === selectedServiceId;
          return (
            <Pressable
              key={service.id}
              onPress={() => { hapticSelection(); setSelectedServiceId(service.id); }}
              style={({ pressed }) => [
                styles.optionCard,
                { backgroundColor: active ? p.surfaceMuted : p.surface, borderColor: active ? p.ink : p.line },
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: p.ink }]}>{service.title}</Text>
                <Text style={[styles.optionMeta, { color: p.inkSoft }]}>
                  {formatMoney(service.priceKzt)}{service.durationMin ? ` · ${formatDuration(service.durationMin)}` : ''}
                </Text>
              </View>
              <View style={[styles.optionBullet, { borderColor: active ? p.ink : p.line, backgroundColor: active ? p.ink : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title={t('booking_day')} />
      <View style={styles.pillWrap}>
        {days.map((day) => (
          <Pill key={day.value} label={day.label} active={selectedDay === day.value} onPress={() => setSelectedDay(day.value)} />
        ))}
      </View>

      <SectionTitle title={t('booking_time')} />
      <View style={styles.pillWrap}>
        {slotsLoading ? (
          <Text style={{ color: p.inkSoft, fontSize: 13, padding: 4 }}>{t('nearby_searching')}</Text>
        ) : slots.length > 0 ? (
          slots.map(({ time, available }) => (
            <Pill
              key={time}
              label={time}
              active={selectedTime === time && available}
              onPress={available ? () => setSelectedTime(time) : undefined}
              style={available ? null : { opacity: 0.3 }}
            />
          ))
        ) : (
          ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map((time) => (
            <Pill key={time} label={time} active={selectedTime === time} onPress={() => setSelectedTime(time)} />
          ))
        )}
      </View>

      {pets.length > 0 ? (
        <>
          <SectionTitle title={t('booking_pet')} subtitle={t('booking_pet_optional')} />
          <View style={styles.stack}>
            {pets.map((pet) => {
              const active = pet.id === selectedPetId;
              return (
                <Pressable
                  key={pet.id}
                  onPress={() => { hapticSelection(); setSelectedPetId(pet.id); }}
                  style={({ pressed }) => [
                    styles.optionCard,
                    { backgroundColor: active ? p.surfaceMuted : p.surface, borderColor: active ? p.ink : p.line },
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionTitle, { color: p.ink }]}>{pet.name}</Text>
                    <Text style={[styles.optionMeta, { color: p.inkSoft }]}>{pet.breed || pet.species || 'Pet'}</Text>
                  </View>
                  <View style={[styles.optionBullet, { borderColor: active ? p.ink : p.line, backgroundColor: active ? p.ink : 'transparent' }]} />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <GlassCard style={styles.notesCard}>
        <Field
          label={t('booking_notes')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('booking_notes_placeholder')}
          multiline
        />
      </GlassCard>

      <PrimaryButton label={t('booking_review_btn')} icon="arrow-right" onPress={handleReview} />
    </Screen>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryRow({ icon, label, value }) {
  const { palette: p } = useTheme();
  if (!value) return null;
  return (
    <View style={[styles.summaryRow, { borderBottomColor: p.line }]}>
      <MaterialCommunityIcons name={icon} size={16} color={p.inkSoft} />
      <Text style={[styles.summaryLabel, { color: p.inkSoft }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: p.ink }]}>{value}</Text>
    </View>
  );
}

function ProviderListItem({ provider, onPress }) {
  const { palette: p } = useTheme();
  const t = useT();
  const service = provider.services?.[0];
  const title = provider.businessName || `${provider.user?.firstName} ${provider.user?.lastName}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.providerCard,
        { backgroundColor: p.surface, borderColor: p.line },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.providerLeft}>
        <View style={[styles.providerIcon, { backgroundColor: p.surfaceMuted }]}>
          <MaterialCommunityIcons name="paw-outline" size={18} color={p.ink} />
        </View>
        <View style={styles.providerCopy}>
          <Text style={[styles.providerName, { color: p.ink }]}>{title}</Text>
          <Text style={[styles.providerMeta, { color: p.inkSoft }]}>
            {service?.title || provider.address || t('provider_nearby')}
          </Text>
        </View>
      </View>
      <View style={styles.providerRight}>
        <Text style={[styles.providerPrice, { color: p.ink }]}>{formatMoney(service?.priceKzt)}</Text>
        <StatusBadge label={provider.avgRating ? provider.avgRating.toFixed(1) : t('provider_new')} tone="neutral" />
      </View>
    </Pressable>
  );
}

function MetricTile({ icon, label, value }) {
  const { palette: p } = useTheme();
  return (
    <GlassCard style={styles.metricTile}>
      <View style={[styles.metricTileIcon, { backgroundColor: p.surfaceMuted }]}>
        <MaterialCommunityIcons name={icon} size={18} color={p.ink} />
      </View>
      <Text style={[styles.metricTileLabel, { color: p.inkSoft }]}>{label}</Text>
      <Text style={[styles.metricTileValue, { color: p.ink }]}>{value}</Text>
    </GlassCard>
  );
}

function makeDayValues() {
  const base = new Date();
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    return d.toISOString().slice(0, 10);
  });
}

function dayOptions(t) {
  const base = new Date();
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    const iso = d.toISOString().slice(0, 10);
    const label = offset === 0 ? t('day_today') : offset === 1 ? t('day_tomorrow') : formatDate(d.toISOString());
    return { label, value: iso };
  });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.body,
    paddingVertical: 0,
  },
  serviceCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  serviceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  serviceCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  serviceCardPrice: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  serviceCardProvider: {
    fontSize: 13,
    fontFamily: typography.body,
  },
  serviceCardMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  serviceCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  serviceCardMetaText: {
    fontSize: 12,
    fontFamily: typography.body,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  mapContainer: {
    height: 480,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  mapLoadingText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: typography.body,
  },
  mapBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  mapBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  callout: {
    width: 220,
    padding: 4,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
    fontFamily: typography.body,
    marginBottom: 2,
  },
  calloutAddr: {
    fontSize: 12,
    color: palette.inkSoft,
    fontFamily: typography.body,
    marginBottom: 4,
  },
  calloutRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  calloutRating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
    fontFamily: typography.body,
  },
  calloutDist: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
    fontFamily: typography.body,
  },
  calloutWa: {
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingVertical: 5,
    alignItems: 'center',
    marginBottom: 4,
  },
  calloutWaText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  calloutOpen: {
    fontSize: 11,
    color: palette.inkSoft,
    textAlign: 'center',
    fontFamily: typography.body,
  },
  bookingBanner: {
    paddingVertical: spacing.md,
  },
  bookingBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  bookingBannerCopy: {
    flex: 1,
    gap: 2,
  },
  bookingBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  bookingBannerMeta: {
    fontSize: 13,
    fontFamily: typography.body,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shortcutCard: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  trailingButton: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  providerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  providerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  providerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerCopy: {
    flex: 1,
    gap: 2,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  providerMeta: {
    fontSize: 13,
    fontFamily: typography.body,
  },
  providerPrice: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: typography.body,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricTile: {
    flex: 1,
    gap: 8,
  },
  metricTileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  metricTileValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  serviceCopy: {
    flex: 1,
    gap: 2,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  serviceMeta: {
    fontSize: 12,
    fontFamily: typography.body,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  reviewCard: {
    gap: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reviewAuthor: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  reviewBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
  },
  stack: {
    gap: spacing.sm,
  },
  optionCard: {
    minHeight: 70,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  optionMeta: {
    fontSize: 12,
    fontFamily: typography.body,
  },
  optionBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  notesCard: {
    paddingVertical: spacing.md,
  },
  confirmCard: {
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  summaryLabel: {
    fontSize: 13,
    fontFamily: typography.body,
    width: 72,
  },
  summaryValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  doneBlock: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  doneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: typography.display,
    textAlign: 'center',
  },
  doneSub: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: typography.body,
  },
  doneSummary: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.92,
  },
});
