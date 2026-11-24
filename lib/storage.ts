import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { createProgressStorage } from './progressStorage';

const native = Capacitor.isNativePlatform();

export const progressStorage = createProgressStorage({
  async get(key) {
    if (!native) return window.localStorage.getItem(key);
    const { value } = await Preferences.get({ key });
    if (value !== null) return value;
    // Migrate an older installation's WebView storage when available.
    const previous = window.localStorage.getItem(key);
    if (previous !== null) await Preferences.set({ key, value: previous });
    return previous;
  },
  async set(key, value) {
    if (native) await Preferences.set({ key, value });
    else window.localStorage.setItem(key, value);
  },
});
