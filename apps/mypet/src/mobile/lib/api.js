import axios from 'axios';

import { categories, createInitialDemoState, demoProviders, previewUser, providerUser } from '../data/demo';
import { PROVIDERS as CSV_PROVIDERS } from '../../data/providers';
import { readJson, readValue, removeValue, writeJson, writeValue } from './storage';
import { pushNotification } from './notifications';

const ASTANA_LAT = 51.18;
const ASTANA_LNG = 71.446;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CATEGORY_LABELS = {
  VETERINARY: 'Ветеринарная клиника',
  GROOMING: 'Груминг',
  BOARDING: 'Передержка',
  TRAINING: 'Тренировки',
  SHELTER: 'Приют',
};

function adaptCsvProvider(p, distanceKm) {
  return {
    id: p.id,
    businessName: p.name,
    address: p.address,
    description: p.desc || '',
    distanceKm: Math.round(distanceKm * 10) / 10,
    avgRating: p.rating || null,
    reviewCount: p.reviews || 0,
    isVerified: false,
    lat: p.lat,
    lng: p.lng,
    user: {
      id: `u-${p.id}`,
      firstName: p.name,
      lastName: '',
      phone: p.phone || '',
      avatarUrl: null,
    },
    services: p.categories.map(cat => ({
      id: `${p.id}-${cat}`,
      title: CATEGORY_LABELS[cat] || cat,
      category: cat,
      priceKzt: null,
      durationMin: null,
    })),
    reviews: [],
    phone: p.phone,
    whatsapp: p.whatsapp,
    instagram: p.instagram,
  };
}

const TOKEN_KEY = 'mypet.session.token';
const REFRESH_KEY = 'mypet.session.refresh';
const MODE_KEY = 'mypet.session.mode';
const PREVIEW_USER_KEY = 'mypet.session.previewUser';
const DEMO_STATE_KEY = 'mypet.demo.state';

function normalizeApiBase(rawValue) {
  if (!rawValue) return '';
  const trimmed = rawValue.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const API_BASE = normalizeApiBase(process.env.EXPO_PUBLIC_API_URL || '');
const API_DOCS_URL = API_BASE ? API_BASE.replace(/\/api$/, '/api-docs') : '';

const client = axios.create({
  baseURL: API_BASE || undefined,
  headers: {
    'Content-Type': 'application/json',
  },
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeFriendlyError(error, fallbackMessage) {
  let message =
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage ||
    'Something went wrong.';

  if (error?.message === 'Network Error' || error?.code === 'ERR_NETWORK') {
    message = API_DOCS_URL
      ? `Cannot reach the API. Open ${API_DOCS_URL} on your phone first.`
      : 'Cannot reach the API.';
  }

  const friendlyError = new Error(message);
  friendlyError.original = error;
  return friendlyError;
}

export async function checkApiReachable() {
  if (!API_DOCS_URL) return false;

  try {
    await axios.get(API_DOCS_URL, {
      timeout: 4000,
      validateStatus: () => true,
    });
    return true;
  } catch {
    return false;
  }
}

async function liveRequest(method, url, config = {}) {
  if (!API_BASE) {
    throw new Error('Set EXPO_PUBLIC_API_URL before using live mode.');
  }

  try {
    const token = await readValue(TOKEN_KEY);
    const response = await client.request({
      method,
      url,
      ...config,
      headers: {
        ...(config.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    return response.data;
  } catch (error) {
    throw makeFriendlyError(error, 'Unable to reach the MyPet API.');
  }
}

async function readDemoState() {
  const existing = await readJson(DEMO_STATE_KEY);
  if (existing) {
    // Migrate old states that lack providerInboxBookings
    if (!existing.providerInboxBookings) {
      const { providerInboxBookings } = createInitialDemoState();
      const migrated = { ...existing, providerInboxBookings };
      await writeJson(DEMO_STATE_KEY, migrated);
      return migrated;
    }
    return existing;
  }

  const fresh = createInitialDemoState();
  await writeJson(DEMO_STATE_KEY, fresh);
  return fresh;
}

async function writeDemoState(value) {
  await writeJson(DEMO_STATE_KEY, value);
  return value;
}

function mergeProviderReviews(provider, state) {
  const extraReviews = state.extraProviderReviews?.[provider.id] || [];
  const reviews = [...(provider.reviews || []), ...extraReviews].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : null;

  return {
    ...clone(provider),
    reviews,
    avgRating,
    reviewCount: reviews.length,
  };
}

function matchCategory(provider, category) {
  if (!category) return true;
  return provider.services?.some((service) => service.category === category);
}

async function readOnlyProviderList(category) {
  const state = await readDemoState();
  return demoProviders
    .map((provider) => mergeProviderReviews(provider, state))
    .filter((provider) => matchCategory(provider, category));
}

export function getApiBaseLabel() {
  return API_BASE || 'Preview mode';
}

export function hasLiveApi() {
  return Boolean(API_BASE);
}

export function getCategories() {
  return categories;
}

export async function hydrateSession() {
  const mode = await readValue(MODE_KEY);

  if (mode === 'demo') {
    const user = (await readJson(PREVIEW_USER_KEY, previewUser)) || previewUser;
    return { mode: 'demo', user };
  }

  const accessToken = await readValue(TOKEN_KEY);
  if (!accessToken || !API_BASE) {
    return { mode: 'guest', user: null };
  }

  try {
    const user = await liveRequest('get', '/auth/me');
    return { mode: 'live', user };
  } catch {
    await signOut();
    return { mode: 'guest', user: null };
  }
}

export async function signInLive(email, password) {
  if (!API_BASE) {
    throw new Error('Add EXPO_PUBLIC_API_URL to use live sign in.');
  }

  try {
    const response = await client.post('/auth/login', { email, password });
    const payload = response.data;

    await writeValue(TOKEN_KEY, payload.accessToken);
    await writeValue(REFRESH_KEY, payload.refreshToken);
    await writeValue(MODE_KEY, 'live');
    await removeValue(PREVIEW_USER_KEY);

    return payload.user;
  } catch (error) {
    throw makeFriendlyError(error, 'Sign in failed.');
  }
}

export async function registerLive(payload) {
  if (!API_BASE) {
    throw new Error('Add EXPO_PUBLIC_API_URL to use live registration.');
  }

  try {
    const response = await client.post('/auth/register', payload);
    const data = response.data;

    await writeValue(TOKEN_KEY, data.accessToken);
    await writeValue(REFRESH_KEY, data.refreshToken);
    await writeValue(MODE_KEY, 'live');
    await removeValue(PREVIEW_USER_KEY);

    return data.user;
  } catch (error) {
    throw makeFriendlyError(error, 'Registration failed.');
  }
}

export async function enterPreviewMode() {
  await writeValue(MODE_KEY, 'demo');
  await writeJson(PREVIEW_USER_KEY, previewUser);
  return previewUser;
}

export async function enterProviderPreviewMode() {
  await writeValue(MODE_KEY, 'demo');
  await writeJson(PREVIEW_USER_KEY, providerUser);
  return providerUser;
}

export async function signOut() {
  await removeValue(TOKEN_KEY);
  await removeValue(REFRESH_KEY);
  await removeValue(MODE_KEY);
  await removeValue(PREVIEW_USER_KEY);
}

export async function listProviders(category) {
  if (API_BASE) {
    try {
      return await client
        .get('/providers', { params: category ? { category } : undefined })
        .then((response) => response.data);
    } catch {
      return readOnlyProviderList(category);
    }
  }

  return readOnlyProviderList(category);
}

export async function getProviderDetails(providerId) {
  if (API_BASE) {
    try {
      return await client.get(`/providers/${providerId}`).then((response) => response.data);
    } catch (error) {
      if (error?.response?.status !== 404) throw makeFriendlyError(error, 'Provider not found.');
      // 404 = not a real DB provider, fall through to local data
    }
  }

  const state = await readDemoState();
  const demoProvider = demoProviders.find((item) => item.id === providerId);
  if (demoProvider) return mergeProviderReviews(demoProvider, state);

  const csvProvider = CSV_PROVIDERS.find((item) => item.id === providerId);
  if (csvProvider) return adaptCsvProvider(csvProvider, 0);

  throw new Error('Provider not found.');
}

export async function getProfile(mode) {
  if (mode === 'demo') {
    const state = await readDemoState();
    return clone(state.profile);
  }

  return liveRequest('get', '/users/profile');
}

export async function updateProfile(mode, payload) {
  if (mode === 'demo') {
    const state = await readDemoState();
    const updated = { ...state.profile, ...payload };
    const nextState = { ...state, profile: updated };
    await writeDemoState(nextState);
    await writeJson(PREVIEW_USER_KEY, updated);
    return clone(updated);
  }

  return liveRequest('patch', '/users/profile', { data: payload });
}

export async function listPets(mode) {
  if (mode === 'demo') {
    const state = await readDemoState();
    return clone(state.pets).sort((left, right) => left.name.localeCompare(right.name));
  }

  return liveRequest('get', '/users/pets');
}

export async function addPet(mode, payload) {
  if (mode === 'demo') {
    const state = await readDemoState();
    const nextPet = {
      id: makeId('pet'),
      ...payload,
      medicalCard: null,
    };
    const nextState = {
      ...state,
      pets: [nextPet, ...state.pets],
    };
    await writeDemoState(nextState);
    return clone(nextPet);
  }

  return liveRequest('post', '/users/pets', { data: payload });
}

export async function getMedicalCard(mode, petId) {
  if (mode === 'demo') {
    const state = await readDemoState();
    return clone(state.medicalCards?.[petId] || null);
  }

  return liveRequest('get', `/users/pets/${petId}/medical-card`);
}

export async function saveMedicalCard(mode, petId, payload) {
  if (mode === 'demo') {
    const state = await readDemoState();
    const nextMedicalCards = {
      ...(state.medicalCards || {}),
      [petId]: payload,
    };
    const nextPets = state.pets.map((pet) =>
      pet.id === petId ? { ...pet, medicalCard: { id: `${petId}-card` } } : pet
    );
    const nextState = {
      ...state,
      pets: nextPets,
      medicalCards: nextMedicalCards,
    };
    await writeDemoState(nextState);
    return clone(payload);
  }

  return liveRequest('put', `/users/pets/${petId}/medical-card`, { data: payload });
}

export async function listBookings(mode) {
  if (mode === 'demo') {
    const state = await readDemoState();
    return clone(state.bookings).sort(
      (left, right) => new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime()
    );
  }

  return liveRequest('get', '/bookings');
}

export async function updateBookingStatus(mode, bookingId, status) {
  if (mode === 'demo') {
    const state = await readDemoState();
    const current = state.bookings.find((item) => item.id === bookingId);
    if (!current) throw new Error('Booking not found.');

    const nowIso = new Date().toISOString();
    const next = state.bookings.map((booking) => {
      if (booking.id !== bookingId) return booking;
      return {
        ...booking,
        status,
        acceptedAt: status === 'ACCEPTED' ? nowIso : booking.acceptedAt || null,
        startedAt: status === 'IN_PROGRESS' ? nowIso : booking.startedAt || null,
        completedAt: status === 'COMPLETED' ? nowIso : booking.completedAt || null,
        cancelledAt: status === 'CANCELLED' ? nowIso : booking.cancelledAt || null,
      };
    });

    // Sync status to the provider's inbox so both views stay in sync
    const syncedProviderBookings = (state.providerInboxBookings || []).map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status,
        acceptedAt: status === 'ACCEPTED' ? nowIso : b.acceptedAt || null,
        startedAt: status === 'IN_PROGRESS' ? nowIso : b.startedAt || null,
        completedAt: status === 'COMPLETED' ? nowIso : b.completedAt || null,
        cancelledAt: status === 'CANCELLED' ? nowIso : b.cancelledAt || null,
      };
    });

    await writeDemoState({ ...state, bookings: next, providerInboxBookings: syncedProviderBookings });

    const notifMap = {
      ACCEPTED: ['Booking confirmed', 'Your appointment has been confirmed by the provider.'],
      IN_PROGRESS: ['Visit started', 'Your appointment is now in progress.'],
      COMPLETED: ['Visit completed', 'Your appointment is complete. Leave a review!'],
      CANCELLED: ['Booking cancelled', 'Your booking has been cancelled.'],
    };
    if (notifMap[status]) {
      await pushNotification(`BOOKING_${status}`, notifMap[status][0], notifMap[status][1], { bookingId });
    }

    return clone(next.find((item) => item.id === bookingId));
  }

  return liveRequest('patch', `/bookings/${bookingId}/status`, { data: { status } });
}

export async function listNearbyProviders(options = {}) {
  const { lat, lng, radius = 5, category, topRated = false } = options;

  if (API_BASE) {
    const queryLat = Number.isFinite(lat) ? lat : ASTANA_LAT;
    const queryLng = Number.isFinite(lng) ? lng : ASTANA_LNG;
    try {
      const data = await client
        .get('/providers/nearby', {
          params: {
            lat: queryLat,
            lng: queryLng,
            radius,
            ...(category ? { category } : {}),
            ...(topRated ? { topRated: true } : {}),
          },
        })
        .then((response) => response.data);
      if (Array.isArray(data)) return data;
    } catch {
      // fall through to CSV data only if API is unreachable
    }
  }

  const centerLat = Number.isFinite(lat) ? lat : ASTANA_LAT;
  const centerLng = Number.isFinite(lng) ? lng : ASTANA_LNG;

  const list = CSV_PROVIDERS
    .filter(p => !category || p.categories.includes(category))
    .map(p => adaptCsvProvider(p, haversineKm(centerLat, centerLng, p.lat, p.lng)))
    .filter(p => p.distanceKm <= radius);

  if (topRated) {
    list.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
  } else {
    list.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  return list;
}

export async function listFavoriteProviderIds(mode) {
  if (mode === 'demo') {
    const state = await readDemoState();
    return clone(state.favoriteProviderIds || []);
  }

  return liveRequest('get', '/users/favorites/ids');
}

export async function toggleFavoriteProvider(mode, providerId, isFavorite) {
  if (mode === 'demo') {
    const state = await readDemoState();
    const current = new Set(state.favoriteProviderIds || []);
    if (isFavorite) current.add(providerId);
    else current.delete(providerId);
    const nextState = { ...state, favoriteProviderIds: Array.from(current) };
    await writeDemoState(nextState);
    return nextState.favoriteProviderIds;
  }

  if (isFavorite) {
    await liveRequest('post', '/users/favorites', { data: { providerId } });
  } else {
    await liveRequest('delete', `/users/favorites/${providerId}`);
  }
  return liveRequest('get', '/users/favorites/ids');
}

export async function searchServices(mode, query, coords) {
  if (!query || query.trim().length < 2) return [];
  if (mode === 'demo') return [];
  try {
    const params = new URLSearchParams({ q: query.trim() });
    if (coords?.latitude) params.set('lat', String(coords.latitude));
    if (coords?.longitude) params.set('lng', String(coords.longitude));
    return await liveRequest('get', `/services/search?${params.toString()}`);
  } catch {
    return [];
  }
}

const ALL_DEMO_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

export async function getProviderSlots(mode, providerId, date) {
  if (mode === 'demo') {
    return { slots: ALL_DEMO_SLOTS.map((time) => ({ time, available: true, isPast: false })), staff: [] };
  }
  return liveRequest('get', `/providers/${providerId}/slots?date=${date}`);
}

export async function getProviderStaff(providerId) {
  return liveRequest('get', `/providers/${providerId}/staff`);
}

export async function listMyStaff(mode) {
  if (mode === 'demo') return [];
  return liveRequest('get', '/providers/me/staff');
}

export async function createStaff(mode, data) {
  if (mode === 'demo') return null;
  return liveRequest('post', '/providers/me/staff', { data });
}

export async function updateStaff(mode, staffId, data) {
  if (mode === 'demo') return null;
  return liveRequest('patch', `/providers/me/staff/${staffId}`, { data });
}

export async function deleteStaff(mode, staffId) {
  if (mode === 'demo') return null;
  return liveRequest('delete', `/providers/me/staff/${staffId}`);
}

export async function createBooking(mode, payload) {
  const { _providerSnapshot, ...apiPayload } = payload;

  if (mode === 'demo') {
    const state = await readDemoState();
    let provider = demoProviders.find((item) => item.services.some((service) => service.id === payload.serviceId));
    let service = provider?.services.find((item) => item.id === payload.serviceId);

    // Fallback: service is from a real API provider shown in demo mode
    if (!provider && _providerSnapshot) {
      provider = _providerSnapshot;
      service = _providerSnapshot.services?.find((item) => item.id === payload.serviceId);
    }

    const pet = state.pets.find((item) => item.id === payload.petId) || null;

    if (!provider || !service) {
      throw new Error('Service not found.');
    }

    const bookingId = makeId('booking');
    const createdAt = new Date().toISOString();

    // Customer-side booking (what the customer sees in their Bookings tab)
    const booking = {
      id: bookingId,
      status: 'PENDING',
      createdAt,
      acceptedAt: null, startedAt: null, completedAt: null, cancelledAt: null,
      scheduledAt: payload.scheduledAt,
      notes: payload.notes || '',
      service: { id: service.id, title: service.title, priceKzt: service.priceKzt },
      provider: {
        id: provider.id,
        businessName: provider.businessName,
        user: { firstName: provider.user.firstName, lastName: provider.user.lastName },
      },
      pet: pet ? { id: pet.id, name: pet.name } : null,
      review: null,
    };

    // Provider-side booking (same id — what the provider sees in their Inbox)
    const providerInboxBooking = {
      id: bookingId,
      status: 'PENDING',
      createdAt,
      acceptedAt: null, startedAt: null, completedAt: null, cancelledAt: null,
      scheduledAt: payload.scheduledAt,
      notes: payload.notes || '',
      service: { id: service.id, title: service.title, priceKzt: service.priceKzt, durationMin: service.durationMin || null },
      customer: {
        id: state.profile.id,
        firstName: state.profile.firstName,
        lastName: state.profile.lastName,
        phone: state.profile.phone || '',
      },
      pet: pet ? { id: pet.id, name: pet.name, breed: pet.breed || '', species: pet.species || '' } : null,
      review: null,
    };

    await writeDemoState({
      ...state,
      bookings: [booking, ...state.bookings],
      providerInboxBookings: [providerInboxBooking, ...(state.providerInboxBookings || [])],
    });
    await pushNotification(
      'BOOKING_REQUESTED',
      'Booking submitted',
      `Your booking for ${service.title} at ${provider.businessName} is waiting for confirmation.`,
      { bookingId },
    );
    return clone(booking);
  }

  return liveRequest('post', '/bookings', { data: apiPayload });
}

export async function submitReview(mode, payload) {
  if (mode === 'demo') {
    const state = await readDemoState();
    const targetBooking = state.bookings.find((item) => item.id === payload.bookingId);
    if (!targetBooking) throw new Error('Booking not found.');

    const review = {
      id: makeId('review'),
      rating: payload.rating,
      comment: payload.comment || '',
      createdAt: new Date().toISOString(),
      user: {
        firstName: state.profile.firstName,
        lastName: state.profile.lastName,
      },
    };

    const nextBookings = state.bookings.map((booking) =>
      booking.id === payload.bookingId ? { ...booking, review } : booking
    );

    const nextState = {
      ...state,
      bookings: nextBookings,
      extraProviderReviews: {
        ...(state.extraProviderReviews || {}),
        [targetBooking.provider.id]: [...(state.extraProviderReviews?.[targetBooking.provider.id] || []), review],
      },
    };

    await writeDemoState(nextState);
    return clone(review);
  }

  return liveRequest('post', '/reviews', { data: payload });
}

// ─── Provider functions ────────────────────────────────────────────────────

export async function listProviderBookings(mode) {
  if (mode === 'demo') {
    const state = await readDemoState();
    return clone(state.providerInboxBookings || []).sort(
      (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
    );
  }
  return liveRequest('get', '/providers/me/bookings');
}

export async function updateProviderBookingStatus(mode, bookingId, status) {
  if (mode === 'demo') {
    const state = await readDemoState();
    const current = (state.providerInboxBookings || []).find((b) => b.id === bookingId);
    if (!current) throw new Error('Booking not found.');

    const nowIso = new Date().toISOString();
    const next = (state.providerInboxBookings || []).map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status,
        acceptedAt: status === 'ACCEPTED' ? nowIso : b.acceptedAt || null,
        startedAt: status === 'IN_PROGRESS' ? nowIso : b.startedAt || null,
        completedAt: status === 'COMPLETED' ? nowIso : b.completedAt || null,
        cancelledAt: status === 'CANCELLED' ? nowIso : b.cancelledAt || null,
      };
    });

    // Sync status back to the customer's booking list so both views stay in sync
    const syncedCustomerBookings = (state.bookings || []).map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status,
        acceptedAt: status === 'ACCEPTED' ? nowIso : b.acceptedAt || null,
        startedAt: status === 'IN_PROGRESS' ? nowIso : b.startedAt || null,
        completedAt: status === 'COMPLETED' ? nowIso : b.completedAt || null,
        cancelledAt: status === 'CANCELLED' ? nowIso : b.cancelledAt || null,
      };
    });

    await writeDemoState({ ...state, providerInboxBookings: next, bookings: syncedCustomerBookings });

    const notifMap = {
      ACCEPTED: ['New booking confirmed', `You confirmed the appointment for ${current.customer?.firstName || 'client'}.`],
      IN_PROGRESS: ['Appointment started', `Visit for ${current.pet?.name || current.customer?.firstName || 'client'} is now in progress.`],
      COMPLETED: ['Appointment completed', `Visit for ${current.pet?.name || current.customer?.firstName || 'client'} is marked complete.`],
      CANCELLED: ['Booking cancelled', `Appointment for ${current.customer?.firstName || 'client'} has been cancelled.`],
    };
    if (notifMap[status]) {
      await pushNotification(`PROVIDER_${status}`, notifMap[status][0], notifMap[status][1], { bookingId });
    }

    return clone(next.find((b) => b.id === bookingId));
  }
  return liveRequest('patch', `/bookings/${bookingId}/status`, { data: { status } });
}

export async function getProviderStats(mode) {
  if (mode === 'demo') {
    const state = await readDemoState();
    const bookings = state.providerInboxBookings || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      pendingCount: bookings.filter((b) => b.status === 'PENDING').length,
      todayCount: bookings.filter(
        (b) => b.scheduledAt?.slice(0, 10) === todayStr && (b.status === 'ACCEPTED' || b.status === 'IN_PROGRESS')
      ).length,
      completedCount: bookings.filter((b) => b.status === 'COMPLETED').length,
      revenue: bookings
        .filter((b) => b.status === 'COMPLETED')
        .reduce((sum, b) => sum + (b.service?.priceKzt || 0), 0),
    };
  }
  return liveRequest('get', '/providers/me/stats');
}

// ─── Notification helpers (live mode) ─────────────────────────────────────

export async function fetchApiNotifications(mode) {
  if (mode !== 'live') {
    return null; // caller should fall back to local storage
  }
  const raw = await liveRequest('get', '/notifications');
  // Normalize DB format (read: bool) → mobile format (readAt: string|null, type: string)
  return raw.map(n => ({
    ...n,
    readAt: n.read ? n.createdAt : null,
    type: 'BOOKING_REQUESTED', // generic fallback icon
  }));
}

export async function fetchApiUnreadCount(mode) {
  if (mode !== 'live') return null;
  try {
    const list = await liveRequest('get', '/notifications');
    return list.filter(n => !n.read).length;
  } catch {
    return null;
  }
}

export async function markApiNotificationsRead(mode) {
  if (mode !== 'live') return;
  await liveRequest('post', '/notifications/read-all').catch(() => {});
}

export async function submitProviderApplication(mode, data) {
  if (mode === 'demo') return null;
  return liveRequest('post', '/provider-applications', { data });
}

export async function getMyProviderApplication(mode) {
  if (mode === 'demo') return null;
  try {
    return await liveRequest('get', '/provider-applications/my');
  } catch {
    return null;
  }
}

export async function deleteAllApiNotifications(mode) {
  if (mode !== 'live') return;
  await liveRequest('delete', '/notifications');
}

export async function listProviderServices(mode) {
  if (mode === 'demo') return null;
  try {
    const provider = await liveRequest('get', '/providers/me');
    const svcs = provider.services || [];
    return svcs;
  } catch (err) {
    if (err?.original?.response?.status === 404) return [];
    throw err;
  }
}

export async function updateProviderService(mode, serviceId, data) {
  if (mode === 'demo') return null;
  const updated = await liveRequest('patch', `/services/${serviceId}`, { data });
  return updated;
}

export async function pollProviderNotifications(mode) {
  if (mode !== 'live') return null;
  try {
    const list = await liveRequest('get', '/notifications');
    const unread = list.filter(n => !n.read);
    return unread;
  } catch {
    return null;
  }
}

export async function adminListApplications(mode) {
  if (mode !== 'live') return [];
  return liveRequest('get', '/admin/provider-applications');
}

export async function adminReviewApplication(mode, id, status, adminNote) {
  if (mode !== 'live') return null;
  return liveRequest('patch', `/admin/provider-applications/${id}`, { data: { status, adminNote } });
}

export async function adminGetStats(mode) {
  if (mode !== 'live') return null;
  return liveRequest('get', '/admin/stats');
}
