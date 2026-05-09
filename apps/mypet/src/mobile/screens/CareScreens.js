import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { addPet, getMedicalCard, getProfile, listBookings, listPets, saveMedicalCard, submitReview, updateBookingStatus } from '../lib/api';
import { formatDate, formatDateTime, initials, relativeLabel } from '../lib/format';
import { formatAgeFromBirthDate, validateMedicalCardForm, validatePetForm, validateProfileForm } from '../lib/validation';
import {
  AvatarBadge,
  DateField,
  EmptyState,
  Field,
  GlassCard,
  HeroTitle,
  Notice,
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

export function BookingsScreen() {
  const { mode } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [composerId, setComposerId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    let active = true;

    listBookings(mode)
      .then((nextBookings) => {
        if (!active) return;
        setBookings(nextBookings);
      })
      .catch((currentError) => {
        if (!active) return;
        setError(currentError.message || 'Unable to load bookings.');
      });

    return () => {
      active = false;
    };
  }, [mode]);

  async function handleReview(bookingId) {
    try {
      await submitReview(mode, {
        bookingId,
        rating,
        comment,
      });
      setComposerId('');
      setComment('');
      setRating(5);
      const nextBookings = await listBookings(mode);
      setBookings(nextBookings);
    } catch (currentError) {
      setError(currentError.message || 'Review failed.');
    }
  }

  async function handleCancel(bookingId) {
    try {
      await updateBookingStatus(mode, bookingId, 'CANCELLED');
      const nextBookings = await listBookings(mode);
      setBookings(nextBookings);
    } catch (currentError) {
      setError(currentError.message || 'Unable to cancel booking.');
    }
  }

  return (
    <Screen>
      <HeroTitle eyebrow="Bookings" title="Your bookings" subtitle="Upcoming and completed visits." />

      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      {bookings.length === 0 ? (
        <EmptyState icon="calendar-blank-outline" title="No bookings" subtitle="Your visits will appear here." />
      ) : (
        bookings.map((booking) => (
          <GlassCard key={booking.id} style={styles.bookingCard}>
            <View style={styles.bookingTopRow}>
              <View style={styles.bookingCopy}>
                <Text style={styles.bookingTitle}>{booking.service?.title || 'Booking'}</Text>
                <Text style={styles.bookingMeta}>
                  {booking.provider?.businessName || `${booking.provider?.user?.firstName || ''} ${booking.provider?.user?.lastName || ''}`.trim() || 'Provider'}
                </Text>
              </View>
              <StatusBadge label={relativeLabel(booking.status)} tone={bookingStatuses[booking.status]} />
            </View>

            <Text style={styles.bookingMeta}>{formatDateTime(booking.scheduledAt)}</Text>
            {booking.pet?.name ? <Text style={styles.bookingSubline}>Pet: {booking.pet.name}</Text> : null}
            {booking.notes ? <Text style={styles.bookingNote}>{booking.notes}</Text> : null}
            <BookingTimeline booking={booking} />

            {(booking.status === 'PENDING' || booking.status === 'ACCEPTED') ? (
              <SecondaryButton label="Cancel booking" icon="close-circle-outline" onPress={() => handleCancel(booking.id)} compact />
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
                            rating >= value ? styles.ratingButtonActive : null,
                            pressed ? styles.pressed : null,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="star"
                            size={16}
                            color={rating >= value ? palette.white : '#98A0A8'}
                          />
                        </Pressable>
                      ))}
                    </View>
                    <Field
                      label="Review"
                      value={comment}
                      onChangeText={setComment}
                      placeholder="Optional"
                      multiline
                    />
                    <PrimaryButton label="Send review" icon="check" onPress={() => handleReview(booking.id)} compact />
                  </View>
                ) : (
                  <SecondaryButton label="Leave review" icon="message-outline" onPress={() => setComposerId(booking.id)} />
                )}
              </View>
            ) : booking.review ? (
              <View style={styles.reviewSummary}>
                <RatingStars rating={booking.review.rating} />
                {booking.review.comment ? <Text style={styles.reviewText}>{booking.review.comment}</Text> : null}
              </View>
            ) : null}
          </GlassCard>
        ))
      )}
    </Screen>
  );
}

function BookingTimeline({ booking }) {
  const steps = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'ACCEPTED', label: 'Accepted' },
    { key: 'IN_PROGRESS', label: 'In progress' },
    { key: 'COMPLETED', label: 'Completed' },
  ];
  const order = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];
  const currentIndex = order.indexOf(booking.status);

  if (booking.status === 'CANCELLED') {
    return <Text style={styles.timelineCancelled}>Cancelled</Text>;
  }

  return (
    <View style={styles.timelineRow}>
      {steps.map((step, index) => {
        const done = index <= currentIndex;
        const active = index === currentIndex;
        return (
          <View key={step.key} style={styles.timelineStep}>
            <View style={[styles.timelineDot, done ? styles.timelineDotDone : null, active ? styles.timelineDotActive : null]} />
            <Text style={[styles.timelineLabel, done ? styles.timelineLabelDone : null]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function PetsScreen({ navigate }) {
  const { mode } = useAuth();
  const [pets, setPets] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    breed: '',
    species: '',
    gender: '',
    birthDate: '',
    age: '',
    weight: '',
    color: '',
  });

  useEffect(() => {
    let active = true;

    listPets(mode)
      .then((nextPets) => {
        if (!active) return;
        setPets(nextPets);
      })
      .catch((currentError) => {
        if (!active) return;
        setError(currentError.message || 'Unable to load pets.');
      });

    return () => {
      active = false;
    };
  }, [mode]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleAddPet() {
    const validationError = validatePetForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const nextPet = await addPet(mode, {
        ...form,
        age: form.birthDate ? formatAgeFromBirthDate(form.birthDate) : form.age,
      });
      setPets((current) => [nextPet, ...current]);
      setForm({
        name: '',
        breed: '',
        species: '',
        gender: '',
        birthDate: '',
        age: '',
        weight: '',
        color: '',
      });
    } catch (currentError) {
      setError(currentError.message || 'Unable to add pet.');
    }
  }

  return (
    <Screen>
      <HeroTitle eyebrow="Pets" title="Your pets" subtitle="Profiles and health cards." />

      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      <SectionTitle title="List" subtitle={`${pets.length} total`} />
      {pets.length === 0 ? (
        <EmptyState icon="paw-outline" title="No pets yet" subtitle="Add your first pet below." />
      ) : (
        pets.map((pet) => (
          <Pressable
            key={pet.id}
            onPress={() => navigate('petDetails', { pet })}
            style={({ pressed }) => [styles.petCard, pressed ? styles.pressed : null]}
          >
            <View style={styles.petBadge}>
              <MaterialCommunityIcons name="paw-outline" size={20} color={palette.ink} />
            </View>
            <View style={styles.petCopy}>
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petMeta}>{pet.breed || pet.species || 'Pet profile'}</Text>
            </View>
            <StatusBadge label={pet.medicalCard ? 'Card ready' : 'No card'} tone={pet.medicalCard ? 'success' : 'warning'} />
          </Pressable>
        ))
      )}

      <GlassCard style={styles.formPanel}>
        <SectionTitle title="Add pet" subtitle="Only the essentials." />
        <Field label="Name" value={form.name} onChangeText={(value) => setField('name', value)} placeholder="Luna" />
        <Field label="Breed" value={form.breed} onChangeText={(value) => setField('breed', value)} placeholder="Poodle" />
        <Field label="Species" value={form.species} onChangeText={(value) => setField('species', value)} placeholder="Dog, cat..." />
        <View style={styles.row}>
          <View style={styles.rowCell}>
            <Field label="Gender" value={form.gender} onChangeText={(value) => setField('gender', value)} placeholder="Female" />
          </View>
          <View style={styles.rowCell}>
            <DateField label="Birth date" value={form.birthDate} onChange={(value) => setField('birthDate', value)} maximumDate={new Date()} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.rowCell}>
            <Field label="Weight" value={form.weight} onChangeText={(value) => setField('weight', value)} placeholder="5 kg" />
          </View>
          <View style={styles.rowCell}>
            <Field label="Color" value={form.color} onChangeText={(value) => setField('color', value)} placeholder="White" />
          </View>
        </View>
        <PrimaryButton label="Save pet" icon="content-save-outline" onPress={handleAddPet} />
      </GlassCard>
    </Screen>
  );
}

export function PetDetailsScreen({ navigate, route }) {
  const { mode } = useAuth();
  const pet = route?.params?.pet;
  const [medicalCard, setMedicalCard] = useState(null);
  const [medicalCardError, setMedicalCardError] = useState('');

  useEffect(() => {
    let active = true;

    if (!pet?.id) return undefined;

    getMedicalCard(mode, pet.id)
      .then((card) => {
        if (!active) return;
        setMedicalCard(card || null);
      })
      .catch((currentError) => {
        if (!active) return;
        setMedicalCard(null);
        setMedicalCardError(currentError.message || 'Unable to load medical data.');
      });

    return () => {
      active = false;
    };
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
      <AvatarBadge
        label={pet.name}
        sublabel={sublabel}
        accent={['#111315']}
        icon="paw"
      />

      <View style={styles.metricGrid}>
        <MetricTile icon="cake-variant-outline" label="Age" value={ageValue} />
        <MetricTile icon="scale-bathroom" label="Weight" value={pet.weight || 'Not set'} />
        <MetricTile icon="palette-outline" label="Color" value={pet.color || 'Not set'} />
        <MetricTile icon="dna" label="Species" value={pet.species || 'Not set'} />
      </View>

      <GlassCard style={styles.healthCard}>
        <SectionTitle
          title="Medical card"
          subtitle={cardItems.length > 0 ? 'Saved health details.' : 'No medical data yet.'}
        />
        {medicalCardError ? <Notice tone="danger" icon="alert-circle" body={medicalCardError} /> : null}
        {cardItems.length > 0 ? (
          <View style={styles.medicalSummary}>
            {cardItems.map((item) => (
              <View key={item.label} style={styles.medicalRow}>
                <Text style={styles.medicalLabel}>{item.label}</Text>
                <Text style={styles.medicalValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.medicalEmpty}>
            <Text style={styles.medicalEmptyText}>Add allergies, medications, vaccinations and notes for providers.</Text>
          </View>
        )}
        <PrimaryButton
          label={cardItems.length > 0 ? 'Edit medical data' : 'Add medical data'}
          icon="hospital-box-outline"
          onPress={() => navigate('medical', { pet })}
          style={styles.healthButton}
        />
      </GlassCard>
    </Screen>
  );
}

export function MedicalCardScreen({ route }) {
  const { mode } = useAuth();
  const pet = route?.params?.pet;
  const [form, setForm] = useState({
    allergies: '',
    chronicDiseases: '',
    medications: '',
    vaccinations: '',
    pastIllnesses: '',
    notes: '',
    lastVetVisit: '',
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
      .catch((currentError) => {
        if (!active) return;
        setError(currentError.message || 'Unable to load medical card.');
      });

    return () => {
      active = false;
    };
  }, [mode, pet?.id]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const validationError = validateMedicalCardForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaved(false);

    try {
      await saveMedicalCard(mode, pet.id, {
        ...form,
        lastVetVisit: form.lastVetVisit ? new Date(`${form.lastVetVisit}T09:00:00`).toISOString() : null,
      });
      setSaved(true);
    } catch (currentError) {
      setError(currentError.message || 'Unable to save medical card.');
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
      <HeroTitle eyebrow="Medical card" title={pet.name} subtitle="Important health notes." />

      {saved ? <Notice tone="success" icon="check-circle-outline" body="Medical card saved." /> : null}
      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      <GlassCard style={styles.formPanel}>
        <DateField label="Last vet visit" value={form.lastVetVisit} onChange={(value) => setField('lastVetVisit', value)} maximumDate={new Date()} />
        <Field label="Allergies" value={form.allergies} onChangeText={(value) => setField('allergies', value)} placeholder="Optional" multiline />
        <Field label="Chronic conditions" value={form.chronicDiseases} onChangeText={(value) => setField('chronicDiseases', value)} placeholder="Optional" multiline />
        <Field label="Medications" value={form.medications} onChangeText={(value) => setField('medications', value)} placeholder="Optional" multiline />
        <Field label="Vaccinations" value={form.vaccinations} onChangeText={(value) => setField('vaccinations', value)} placeholder="Optional" multiline />
        <Field label="Past illnesses" value={form.pastIllnesses} onChangeText={(value) => setField('pastIllnesses', value)} placeholder="Optional" multiline />
        <Field label="Notes" value={form.notes} onChangeText={(value) => setField('notes', value)} placeholder="Optional" multiline />
        <PrimaryButton label="Save card" icon="content-save-outline" onPress={handleSave} />
      </GlassCard>
    </Screen>
  );
}

export function ProfileScreen() {
  const { apiLabel, logout, mode, saveProfile, user } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getProfile(mode)
      .then((profile) => {
        if (!active) return;
        setForm({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          phone: profile.phone || '',
        });
      })
      .catch((currentError) => {
        if (!active) return;
        setError(currentError.message || 'Unable to load profile.');
      });

    return () => {
      active = false;
    };
  }, [mode]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const validationError = validateProfileForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaved(false);

    try {
      await saveProfile(form);
      setSaved(true);
    } catch (currentError) {
      setError(currentError.message || 'Unable to save profile.');
    }
  }

  const label = `${form.firstName || user?.firstName || ''} ${form.lastName || user?.lastName || ''}`.trim() || 'MyPet owner';

  return (
    <Screen>
      <AvatarBadge
        label={label}
        sublabel={user?.email || 'owner@mypet.app'}
        initials={initials(user)}
        accent={['#111315']}
      />

      <View style={styles.metricRow}>
        <MetricTile icon="cellphone-marker" label="Mode" value={mode === 'demo' ? 'Preview' : 'Live'} />
        <MetricTile icon="lan-connect" label="Source" value={apiLabel} />
      </View>

      {saved ? <Notice tone="success" icon="check-circle-outline" body="Profile saved." /> : null}
      {error ? <Notice tone="danger" icon="alert-circle" body={error} /> : null}

      <GlassCard style={styles.formPanel}>
        <SectionTitle title="Profile" subtitle="Basic account info." />
        <Field label="First name" value={form.firstName} onChangeText={(value) => setField('firstName', value)} placeholder="Aruzhan" />
        <Field label="Last name" value={form.lastName} onChangeText={(value) => setField('lastName', value)} placeholder="Bektas" />
        <Field label="Phone" value={form.phone} onChangeText={(value) => setField('phone', value)} placeholder="+7 777 000 0000" keyboardType="phone-pad" autoCapitalize="none" />
        <PrimaryButton label="Save" icon="content-save-outline" onPress={handleSave} />
        <SecondaryButton label="Sign out" icon="logout" onPress={logout} />
      </GlassCard>
    </Screen>
  );
}

function MetricTile({ icon, label, value }) {
  return (
    <GlassCard style={styles.metricTile}>
      <View style={styles.metricIcon}>
        <MaterialCommunityIcons name={icon} size={18} color={palette.ink} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </GlassCard>
  );
}

function buildMedicalCardItems(card) {
  if (!card) return [];

  return [
    { label: 'Last vet visit', value: card.lastVetVisit ? formatDate(card.lastVetVisit) : '' },
    { label: 'Allergies', value: card.allergies },
    { label: 'Chronic conditions', value: card.chronicDiseases },
    { label: 'Medications', value: card.medications },
    { label: 'Vaccinations', value: card.vaccinations },
    { label: 'Past illnesses', value: card.pastIllnesses },
    { label: 'Notes', value: card.notes },
  ].filter((item) => item.value && String(item.value).trim());
}

const styles = StyleSheet.create({
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
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  bookingMeta: {
    color: palette.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
  },
  bookingSubline: {
    color: palette.inkSoft,
    fontSize: 13,
    fontFamily: typography.body,
  },
  bookingNote: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
  },
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
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.line,
  },
  ratingButtonActive: {
    backgroundColor: palette.black,
    borderColor: palette.black,
  },
  reviewSummary: {
    gap: 8,
    paddingTop: spacing.xs,
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
    backgroundColor: '#CDD2D7',
  },
  timelineDotDone: {
    backgroundColor: palette.black,
  },
  timelineDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLabel: {
    color: palette.inkSoft,
    fontSize: 10,
    fontFamily: typography.body,
  },
  timelineLabelDone: {
    color: palette.ink,
    fontWeight: '600',
  },
  timelineCancelled: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.body,
  },
  reviewText: {
    color: palette.inkSoft,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body,
  },
  petCard: {
    minHeight: 76,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
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
    backgroundColor: palette.surfaceMuted,
  },
  petCopy: {
    flex: 1,
    gap: 2,
  },
  petName: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  petMeta: {
    color: palette.inkSoft,
    fontSize: 13,
    fontFamily: typography.body,
  },
  formPanel: {
    gap: spacing.md,
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
    borderBottomColor: palette.line,
  },
  medicalLabel: {
    color: palette.inkSoft,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  medicalValue: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
  },
  medicalEmpty: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
  },
  medicalEmptyText: {
    color: palette.inkSoft,
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
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    color: palette.inkSoft,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.display,
  },
  pressed: {
    opacity: 0.92,
  },
});
