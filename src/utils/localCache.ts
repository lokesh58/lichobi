type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

export type LocalCacheOptions = {
  ttlSeconds: number;
  cleanupIntervalSeconds?: number;
};

export class LocalCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttlMs: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: LocalCacheOptions) {
    this.ttlMs = options.ttlSeconds * 1000;
    const cleanupMs = (options.cleanupIntervalSeconds ?? 30) * 1000;
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupMs);
  }

  public set(key: string, value: T): void {
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  public get(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry?.data;
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}
