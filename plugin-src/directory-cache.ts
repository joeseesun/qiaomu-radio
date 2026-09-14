const FRESH_MS = 15 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;

/** Session-only, bounded cache. Audio and listening activity are never cached here. */
export class DirectoryCache<T> {
  private entries = new Map<string, { value: T; at: number }>();
  private pending = new Map<string, Promise<T>>();

  peek(key: string): T | undefined {
    const entry = this.entries.get(key);
    return entry && Date.now() - entry.at < STALE_MS ? entry.value : undefined;
  }

  get(key: string, fetcher: () => Promise<T>): Promise<T> {
    const entry = this.entries.get(key);
    if (entry && Date.now() - entry.at < FRESH_MS) return Promise.resolve(entry.value);
    const existing = this.pending.get(key);
    if (existing) return existing;
    const request = fetcher().then(value => {
      this.entries.delete(key);
      this.entries.set(key, { value, at: Date.now() });
      if (this.entries.size > 48) this.entries.delete(this.entries.keys().next().value!);
      return value;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }
}
