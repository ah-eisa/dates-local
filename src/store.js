import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "dates-local-v1";

const empty = () => ({
  items: [],
  settings: { morningHour: 8, morningMinute: 0, defaultRemindDays: 3, expiryWindowDays: 30 },
});

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      settings: { ...empty().settings, ...(parsed.settings || {}) },
    };
  } catch {
    return empty();
  }
}

export async function saveState(state) {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
