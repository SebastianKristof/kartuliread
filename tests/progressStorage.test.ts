import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgressStorage, PROGRESS_KEYS } from '../lib/progressStorage';

test('saved progress is fully hydrated before reads and initial saves', async () => {
  const saved = new Map<string, string>([[PROGRESS_KEYS[0], '{"1":23}'], [PROGRESS_KEYS[1], '4']]);
  const storage = createProgressStorage({
    async get(key) { return saved.get(key) ?? null; },
    async set(key, value) { saved.set(key, value); },
  });
  assert.throws(() => storage.getItem(PROGRESS_KEYS[0]), /not initialized/);
  await assert.rejects(storage.setItem(PROGRESS_KEYS[0], '{}'), /not initialized/);
  await storage.initialize();
  assert.equal(storage.getItem(PROGRESS_KEYS[0]), '{"1":23}');
  assert.equal(storage.getItem(PROGRESS_KEYS[1]), '4');
  assert.equal(storage.getItem(PROGRESS_KEYS[2]), null);
});

test('rapid saves cannot finish out of order', async () => {
  const writes: string[] = [];
  let release: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const storage = createProgressStorage({
    async get() { return null; },
    async set(_key, value) {
      if (value === '1') await gate;
      writes.push(value);
    },
  });
  await storage.initialize();
  const first = storage.setItem(PROGRESS_KEYS[1], '1');
  const second = storage.setItem(PROGRESS_KEYS[1], '2');
  assert.equal(storage.getItem(PROGRESS_KEYS[1]), '2');
  await Promise.resolve();
  assert.deepEqual(writes, []);
  release!();
  await Promise.all([first, second]);
  assert.deepEqual(writes, ['1', '2']);
});

test('a failed save is surfaced and does not block retrying', async () => {
  let attempts = 0;
  const saved = new Map<string, string>();
  const storage = createProgressStorage({
    async get(key) { return saved.get(key) ?? null; },
    async set(key, value) {
      if (++attempts === 1) throw new Error('disk unavailable');
      saved.set(key, value);
    },
  });
  await storage.initialize();
  await assert.rejects(storage.setItem(PROGRESS_KEYS[1], '3'), /disk unavailable/);
  await storage.setItem(PROGRESS_KEYS[1], '3');
  assert.equal(saved.get(PROGRESS_KEYS[1]), '3');
});

test('a startup read failure prevents default progress from overwriting saved data', async () => {
  let failing = true;
  let writes = 0;
  const storage = createProgressStorage({
    async get() {
      if (failing) throw new Error('storage unavailable');
      return '5';
    },
    async set() { writes++; },
  });
  await assert.rejects(storage.initialize(), /storage unavailable/);
  await assert.rejects(storage.setItem(PROGRESS_KEYS[1], '1'), /not initialized/);
  assert.equal(writes, 0);
  failing = false;
  await storage.initialize();
  assert.equal(storage.getItem(PROGRESS_KEYS[1]), '5');
});
