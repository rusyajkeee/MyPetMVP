import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { createBooking, getCategories, getProviderDetails, listBookings, listFavoriteProviderIds, listNearbyProviders, listPets, listProviders, toggleFavoriteProvider } from '../lib/api';
import { formatDate, formatDateTime, formatMoney, relativeLabel } from '../lib/format';
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
  StatusBadge,
} from '../ui';
import { palette, radius, spacing, typography } from '../theme';

const bookingStatuses = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  IN_PROGRESS: 'warning',
  COMPLETED: 'neutral',
  CANCELLED: 'neutral',
};

export function HomeScreen({ navigate }) {
  const { mode, user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([listProviders(), listBookings(mode)])
      .then(([nextProviders, nextBookings]) => {
        if (!active) return;
        setProviders(nextProviders.slice(0, 3));
        setBookings(nextBookings.slice(0, 1));
      })
      .catch(() => {
        if (!active) return;
        setProviders([]);
        setBookings([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mode]);

  const nextBooking = bookings[0];

  return (
    <Screen>
      <HeroTitle
        eyebrow="Home"
        title={`Hi, ${user?.firstName || 'there'}`}
        subtitle="Book services nearby"
      />

      {nextBooking ? (
        <GlassCard style={styles.bookingBanner}>
          <View style={styles.bookingBannerRow}>
            <View style={styles.bookingBannerCopy}>
              <Text style={styles.bookingBannerTitle}>{nextBooking.service?.title}</Text>
              <Text style={styles.bookingBannerMeta}>{formatDateTime(nextBooking.scheduledAt)}</Text>
            </View>
            <StatusBadge label={relativeLabel(nextBooking.status)} tone={bookingStatuses[nextBooking.status]} />
          </View>
        </GlassCard>
      ) : null}

      <SectionTitle title="Services" />
      <View style={styles.grid}>
        {getCategories().map((category) => (
          <Pressable
            key={category.slug}
            onPress={() => navigate('discover', { category: category.slug })}
            style={({ pressed }) => [styles.shortcutCard, pressed ? styles.pressed : null]}
          >
            <View style={styles.shortcutIcon}>
              <MaterialCommunityIcons name={category.icon} size={20} color={palette.ink} />
            </View>
            <Text style={styles.shortcutLabel}>{category.label}</Text>
          </Pressable>
        ))}
      </View>

      <SectionTitle
        title="Nearby"
        subtitle={loading ? 'Loading' : undefined}
        trailing={<SecondaryButton label="Map" icon="map-search-outline" onPress={() => navigate('nearby')} style={styles.trailingButton} />}
      />

      {providers.length === 0 && !loading ? (
        <EmptyState
          icon="storefront-outline"
          title="No providers"
          subtitle="Try again later"
          action={<PrimaryButton label="Open catalog" onPress={() => navigate('discover')} compact />}
        />
      ) : (
        providers.map((provider) => (
          <ProviderListItem key={provider.id} provider={provider} onPress={() => navigate('provider', { providerId: provider.id })} />
        ))
      )}
    </Screen>
  );
}

const RADIUS_OPTIONS = [1, 3, 5, 10];

export function NearbyServicesScreen({ navigate }) {
  const [category, setCategory] = useState(getCategories()[0].slug);
  const [radiusKm, setRadiusKm] = useState(5);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topRated, setTopRated] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadNearby() {
      setLoading(true);
      let coords = { lat: null, lng: null };

      if (typeof navigator !== 'undefined' && navigator.geolocation?.getCurrentPosition) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              resolve();
            },
            () => resolve(),
            { timeout: 8000, maximumAge: 60000 }
          );
        });
      }

      const items = await listNearbyProviders({
        ...coords,
        radius: radiusKm,
        category,
        topRated,
      });
      if (!active) return;
      setProviders(items);
      setLoading(false);
    }

    loadNearby().catch(() => {
      if (!active) return;
      setProviders([]);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [category, radiusKm, topRated]);

  return (
    <Screen>
      <HeroTitle eyebrow="Nearby" title="Services around you" subtitle="Geo-based provider search" />
      <View style={styles.pillWrap}>
        {getCategories().map((item) => (
          <Pill key={item.slug} label={item.label} active={category === item.slug} onPress={() => setCategory(item.slug)} />
        ))}
      </View>
      <View style={styles.pillWrap}>
        {RADIUS_OPTIONS.map((value) => (
          <Pill key={value} label={`${value} km`} active={radiusKm === value} onPress={() => setRadiusKm(value)} />
        ))}
        <Pill label="Top rated" active={topRated} onPress={() => setTopRated((value) => !value)} />
      </View>
      <SectionTitle title="Results" subtitle={loading ? 'Searching' : `${providers.length}`} />
      {providers.length === 0 && !loading ? (
        <EmptyState icon="map-search-outline" title="Nothing nearby" subtitle="Expand the radius or change category" />
      ) : (
        providers.map((provider) => (
          <ProviderListItem key={provider.id} provider={provider} onPress={() => navigate('provider', { providerId: provider.id })} />
        ))
      )}
    </Screen>
  );
}

export function DiscoverScreen({ navigate, route }) {
  const initialCategory = route?.params?.category || getCategories()[0].slug;
  const [category, setCategory] = useState(initialCategory);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    listProviders(category)
      .then((nextProviders) => {
        if (!active) return;
        setProviders(nextProviders);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category]);

  return (
    <Screen>
      <HeroTitle eyebrow="Discover" title="Find a provider" />

      <View style={styles.pillWrap}>
        {getCategories().map((item) => (
          <Pill
            key={item.slug}
            label={item.label}
            icon={item.icon}
            active={category === item.slug}
            onPress={() => setCategory(item.slug)}
          />
        ))}
      </View>

      <SectionTitle title="Results" subtitle={loading ? 'Loading' : `${providers.length}`} />

      {providers.length === 0 && !loading ? (
        <EmptyState icon="map-search-outline" title="No results" subtitle="Try another category" />
      ) : (
        providers.map((provider) => (
          <ProviderListItem key={provider.id} provider={provider} onPress={() => navigate('provider', { providerId: provider.id })} />
        ))
      )}
    </Screen>
  );
}

export function ProviderScreen({ navigate, route }) {
  const { mode } = useAuth();
  const providerId = route?.params?.providerId;
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let active = true;

    getProviderDetails(providerId)
      .then((nextProvider) => {
        if (!active) return;
        setProvider(nextProvider);
      })
      .catch((currentError) => {
        if (!active) return;
        setError(currentError.message || 'Provider error');
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [providerId]);

  useEffect(() => {
    let active = true;
    listFavoriteProviderIds(mode)
      .then((ids) => {
        if (!active) return;
        setFavorite(Array.isArray(ids) && ids.includes(providerId));
      })
      .catch(() => {
        if (!active) return;
        setFavorite(false);
      });
    return () => {
      active = false;
    };
  }, [mode, providerId]);

  async function handleToggleFavorite() {
    try {
      await toggleFavoriteProvider(mode, providerId, !favorite);
      setFavorite((current) => !current);
    } catch (currentError) {
      setError(currentError.message || 'Unable to update favorites');
    }
  }

  if (loading) {
    return <Screen><GlassCard><Text style={styles.loadingText}>Loading</Text></GlassCard></Screen>;
  }

  if (!provider) {
    return (
      <Screen>
        <EmptyState icon="account-search-outline" title="Not found" subtitle={error || 'Try another provider'} action={<PrimaryButton label="Back" onPress={() => navigate('discover')} compact />} />
      </Screen>
    );
  }

  const name = provider.businessName || `${provider.user?.firstName} ${provider.user?.lastName}`;

  return (
    <Screen>
      <AvatarBadge label={name} sublabel={provider.address || 'Nearby'} icon="paw" />
      <SecondaryButton label={favorite ? 'Saved in favorites' : 'Save provider'} icon={favorite ? 'heart' : 'heart-outline'} onPress={handleToggleFavorite} />

      <View style={styles.metaRow}>
        <MetricTile icon="star-outline" label="Rating" value={provider.avgRating ? provider.avgRating.toFixed(1) : 'New'} />
        <MetricTile icon="message-reply-outline" label="Reviews" value={`${provider.reviewCount || 0}`} />
      </View>

      <SectionTitle title="Services" />
      {provider.services?.map((service) => (
        <GlassCard key={service.id} style={styles.serviceRow}>
          <View style={styles.serviceCopy}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text style={styles.serviceMeta}>{service.durationMin ? `${service.durationMin} min` : 'Open'}</Text>
          </View>
          <Text style={styles.servicePrice}>{formatMoney(service.priceKzt)}</Text>
        </GlassCard>
      ))}

      {(provider.reviews || []).length > 0 ? (
        <>
          <SectionTitle title="Reviews" />
          {provider.reviews.slice(0, 2).map((review) => (
            <GlassCard key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{review.user?.firstName} {review.user?.lastName}</Text>
                <RatingStars rating={review.rating} />
              </View>
              {review.comment ? <Text style={styles.reviewBody}>{review.comment}</Text> : null}
            </GlassCard>
          ))}
        </>
      ) : null}

      <PrimaryButton label="Book" icon="calendar-check-outline" onPress={() => navigate('booking', { providerId })} />
    </Screen>
  );
}

export function BookingScreen({ navigate, route }) {
  const { mode } = useAuth();
  const providerId = route?.params?.providerId;
  const [provider, setProvider] = useState(null);
  const [pets, setPets] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedPetId, setSelectedPetId] = useState('');
  const [selectedDay, setSelectedDay] = useState(dayOptions()[1]?.value || dayOptions()[0].value);
  const [selectedTime, setSelectedTime] = useState('11:00');
  const [notes, setNotes] = useState('');

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
      .catch((currentError) => {
        if (!active) return;
        setError(currentError.message || 'Booking error');
      });

    return () => {
      active = false;
    };
  }, [mode, providerId]);

  async function handleCreateBooking() {
    if (!selectedServiceId) {
      setError('Choose service');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${selectedDay}T${selectedTime}:00`).toISOString();
      await createBooking(mode, {
        serviceId: selectedServiceId,
        petId: selectedPetId || undefined,
        scheduledAt,
        notes: notes.trim() || undefined,
      });
      navigate('bookings');
    } catch (currentError) {
      setError(currentError.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!provider) {
    return (
      <Screen>
        <EmptyState icon="calendar-remove-outline" title="Booking unavailable" subtitle={error || 'Try again'} />
      </Screen>
    );
  }

  return (
    <Screen>
      <HeroTitle eyebrow="Booking" title={provider.businessName || 'New booking'} />

      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      <SectionTitle title="Service" />
      <View style={styles.stack}>
        {provider.services?.map((service) => {
          const active = service.id === selectedServiceId;
          return (
            <Pressable key={service.id} onPress={() => setSelectedServiceId(service.id)} style={({ pressed }) => [styles.optionCard, active ? styles.optionCardActive : null, pressed ? styles.pressed : null]}>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, active ? styles.optionTitleActive : null]}>{service.title}</Text>
                <Text style={[styles.optionMeta, active ? styles.optionMetaActive : null]}>
                  {formatMoney(service.priceKzt)} - {service.durationMin ? `${service.durationMin} min` : 'Open'}
                </Text>
              </View>
              <View style={[styles.optionBullet, active ? styles.optionBulletActive : null]} />
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title="Day" />
      <View style={styles.pillWrap}>
        {dayOptions().map((day) => (
          <Pill key={day.value} label={day.label} active={selectedDay === day.value} onPress={() => setSelectedDay(day.value)} />
        ))}
      </View>

      <SectionTitle title="Time" />
      <View style={styles.pillWrap}>
        {['09:00', '10:00', '11:00', '13:00', '15:00', '17:00'].map((time) => (
          <Pill key={time} label={time} active={selectedTime === time} onPress={() => setSelectedTime(time)} />
        ))}
      </View>

      {pets.length > 0 ? (
        <>
          <SectionTitle title="Pet" />
          <View style={styles.stack}>
            {pets.map((pet) => {
              const active = pet.id === selectedPetId;
              return (
                <Pressable key={pet.id} onPress={() => setSelectedPetId(pet.id)} style={({ pressed }) => [styles.optionCard, active ? styles.optionCardActive : null, pressed ? styles.pressed : null]}>
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionTitle, active ? styles.optionTitleActive : null]}>{pet.name}</Text>
                    <Text style={[styles.optionMeta, active ? styles.optionMetaActive : null]}>{pet.breed || pet.species || 'Pet'}</Text>
                  </View>
                  <View style={[styles.optionBullet, active ? styles.optionBulletActive : null]} />
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <GlassCard style={styles.notesCard}>
        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" multiline />
      </GlassCard>

      <PrimaryButton label={submitting ? 'Creating' : 'Confirm'} onPress={handleCreateBooking} disabled={submitting} />
    </Screen>
  );
}

function ProviderListItem({ provider, onPress }) {
  const service = provider.services?.[0];
  const title = provider.businessName || `${provider.user?.firstName} ${provider.user?.lastName}`;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.providerCard, pressed ? styles.pressed : null]}>
      <View style={styles.providerLeft}>
        <View style={styles.providerIcon}>
          <MaterialCommunityIcons name="paw-outline" size={18} color={palette.ink} />
        </View>
        <View style={styles.providerCopy}>
          <Text style={styles.providerName}>{title}</Text>
          <Text style={styles.providerMeta}>{service?.title || provider.address || 'Provider'}</Text>
        </View>
      </View>
      <View style={styles.providerRight}>
        <Text style={styles.providerPrice}>{formatMoney(service?.priceKzt)}</Text>
        <StatusBadge label={provider.avgRating ? provider.avgRating.toFixed(1) : 'New'} tone="neutral" />
      </View>
    </Pressable>
  );
}

function MetricTile({ icon, label, value }) {
  return (
    <GlassCard style={styles.metricTile}>
      <View style={styles.metricTileIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={palette.ink} />
      </View>
      <Text style={styles.metricTileLabel}>{label}</Text>
      <Text style={styles.metricTileValue}>{value}</Text>
    </GlassCard>
  );
}

function dayOptions() {
  const base = new Date();
  return [0, 1, 2, 3].map((offset) => {
    const value = new Date(base);
    value.setDate(base.getDate() + offset);
    const iso = value.toISOString().slice(0, 10);
    const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : formatDate(value.toISOString());
    return { label, value: iso };
  });
}

const styles = StyleSheet.create({
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
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  bookingBannerMeta: {
    color: palette.inkSoft,
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
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    gap: 8,
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  trailingButton: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
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
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerCopy: {
    flex: 1,
    gap: 2,
  },
  providerName: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  providerMeta: {
    color: palette.inkSoft,
    fontSize: 13,
    fontFamily: typography.body,
  },
  providerPrice: {
    color: palette.ink,
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
    color: palette.inkSoft,
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
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTileLabel: {
    color: palette.inkSoft,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  metricTileValue: {
    color: palette.ink,
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
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  reviewBody: {
    color: palette.inkSoft,
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
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  optionCardActive: {
    borderColor: palette.black,
    backgroundColor: palette.surfaceMuted,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  optionTitleActive: {
    color: palette.black,
  },
  optionMeta: {
    color: palette.inkSoft,
    fontSize: 12,
    fontFamily: typography.body,
  },
  optionMetaActive: {
    color: palette.inkSoft,
  },
  optionBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#BCC2C9',
  },
  optionBulletActive: {
    backgroundColor: palette.black,
    borderColor: palette.black,
  },
  notesCard: {
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
});
