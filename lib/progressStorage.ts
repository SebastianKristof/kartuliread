export const PROGRESS_KEYS = [
  'kartuliread_progress',
  'kartuliread_current_level',
  'kartuliread_mastered_sets',
] as const;

export interface ProgressBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

// Hydrate before React mounts so initial effects cannot overwrite saved progress.
// Serialize writes so a slower older save cannot replace a newer one.
export function createProgressStorage(backend: ProgressBackend) {
  const cache = new Map<string, string | null>();
  let ready = false;
  let pending: Promise<void> = Promise.resolve();

  return {
    async initialize() {
      const entries = await Promise.all(PROGRESS_KEYS.map(async key =>
        [key, await backend.get(key)] as const));
      for (const [key, value] of entries) cache.set(key, value);
      ready = true;
    },
    getItem(key: string) {
      if (!ready) throw new Error('Progress storage is not initialized');
      return cache.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (!ready) return Promise.reject(new Error('Progress storage is not initialized'));
      cache.set(key, value);
      const write = pending.catch(() => {}).then(() => backend.set(key, value));
      pending = write;
      return write;
    },
  };
}
