interface SecureValues {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
// Two fixed slots keep the old value readable until the new encrypted chunks are complete.
export function chunkedStorage(values: SecureValues) {
  const countKey = (key: string, slot: string) => `${key}.slot${slot}.count`;
  const chunkKey = (key: string, slot: string, index: number) => `${key}.slot${slot}.${index}`;
  async function count(key: string, slot: string) {
    const value = await values.get(countKey(key, slot));
    if (value === null) return 0;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 2000)
      throw new Error('Offline storage is invalid.');
    return parsed;
  }
  async function clearSlot(key: string, slot: string) {
    const chunks = await count(key, slot);
    for (let index = 0; index < chunks; index++) await values.remove(chunkKey(key, slot, index));
    await values.remove(countKey(key, slot));
  }
  return {
    async getItem(key: string): Promise<string | null> {
      const slot = await values.get(`${key}.head`);
      if (slot === null) return null;
      if (slot !== '0' && slot !== '1') throw new Error('Offline storage is invalid.');
      const chunks = await count(key, slot);
      let value = '';
      for (let index = 0; index < chunks; index++) {
        const chunk = await values.get(chunkKey(key, slot, index));
        if (chunk === null) throw new Error('A saved offline viewing is unavailable.');
        value += chunk;
      }
      return value;
    },
    async setItem(key: string, value: string): Promise<void> {
      const head = await values.get(`${key}.head`);
      const slot = head === '0' ? '1' : '0';
      await clearSlot(key, slot);
      // 400 Unicode code points stay below SecureStore's 2 KB limit even with four-byte UTF-8.
      const points = Array.from(value);
      const chunks = Math.ceil(points.length / 400);
      if (chunks > 2000)
        throw new Error('The offline queue is too large. Sync before adding more.');
      await values.set(countKey(key, slot), String(chunks));
      for (let index = 0; index < chunks; index++)
        await values.set(
          chunkKey(key, slot, index),
          points.slice(index * 400, (index + 1) * 400).join(''),
        );
      await values.set(`${key}.head`, slot);
      // Old chunks remain tracked if cleanup fails, so sign-out can remove both slots.
      if (head !== null) await clearSlot(key, head).catch(() => undefined);
    },
    async removeItem(key: string): Promise<void> {
      await values.remove(`${key}.head`);
      await clearSlot(key, '0');
      await clearSlot(key, '1');
    },
  };
}
