import axios from 'axios';

import { categories, createInitialDemoState, demoProviders, previewUser } from '../data/demo';
import { readJson, readValue, removeValue, writeJson, writeValue } from './storage';

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
  if (existing) return existing;

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
    } catch {
      const state = await readDemoState();
      const provider = demoProviders.find((item) => item.id === providerId);
      if (!provider) throw new Error('Provider not found.');
      return mergeProviderReviews(provider, state);
    }
  }

  const state = await readDemoState();
  const provider = demoProviders.find((item) => item.id === providerId);
  if (!provider) throw new Error('Provider not found.');
  return mergeProviderReviews(provider, state);
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

    await writeDemoState({ ...state, bookings: next });
    return clone(next.find((item) => item.id === bookingId));
  }

  return liveRequest('patch', `/bookings/${bookingId}/status`, { data: { status } });
}

export async function listNearbyProviders(options = {}) {
  const { lat, lng, radius = 5, category, topRated = false } = options;

  if (API_BASE && Number.isFinite(lat) && Number.isFinite(lng)) {
    try {
      return await client
        .get('/providers/nearby', {
          params: {
            lat,
            lng,
            radius,
            ...(category ? { category } : {}),
            ...(topRated ? { topRated: true } : {}),
          },
        })
        .then((response) => response.data);
    } catch {
      // fall back to demo in preview mode when API is unreachable
    }
  }

  const list = await readOnlyProviderList(category);
  return list
    .map((provider) => ({
      ...provider,
      distanceKm: provider.distanceKm || 0,
      rating: provider.avgRating || null,
      isVerified: provider.isVerified ?? true,
    }))
    .filter((provider) => provider.distanceKm <= radius)
    .sort((left, right) => {
      if (topRated) {
        const ratingDiff = (right.rating || 0) - (left.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
      }
      return (left.distanceKm || 0) - (right.distanceKm || 0);
    });
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

export async function createBooking(mode, payload) {
  if (mode === 'demo') {
    const state = await readDemoState();
    const provider = demoProviders.find((item) => item.services.some((service) => service.id === payload.serviceId));
    const service = provider?.services.find((item) => item.id === payload.serviceId);
    const pet = state.pets.find((item) => item.id === payload.petId) || null;

    if (!provider || !service) {
      throw new Error('Service not found.');
    }

    const booking = {
      id: makeId('booking'),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      acceptedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      scheduledAt: payload.scheduledAt,
      notes: payload.notes || '',
      service: { id: service.id, title: service.title, priceKzt: service.priceKzt },
      provider: {
        id: provider.id,
        businessName: provider.businessName,
        user: {
          firstName: provider.user.firstName,
          lastName: provider.user.lastName,
        },
      },
      pet: pet ? { id: pet.id, name: pet.name } : null,
      review: null,
    };

    const nextState = {
      ...state,
      bookings: [booking, ...state.bookings],
    };
    await writeDemoState(nextState);
    return clone(booking);
  }

  return liveRequest('post', '/bookings', { data: payload });
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
