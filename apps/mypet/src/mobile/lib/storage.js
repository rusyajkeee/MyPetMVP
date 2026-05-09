import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readValue(key) {
  return AsyncStorage.getItem(key);
}

export async function writeValue(key, value) {
  return AsyncStorage.setItem(key, value);
}

export async function removeValue(key) {
  return AsyncStorage.removeItem(key);
}

export async function readJson(key, fallback = null) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function writeJson(key, value) {
  return AsyncStorage.setItem(key, JSON.stringify(value));
}
