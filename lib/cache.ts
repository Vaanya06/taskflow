import "server-only";

import { redis } from "@/lib/redis";

const DEFAULT_TTL_SECONDS = 60;

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get<T>(key);
    return value ?? null;
  } catch (error) {
    console.error("Redis get failed", error);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error("Redis set failed", error);
  }
}

export async function cacheDel(keys: string | string[]): Promise<void> {
  try {
    if (Array.isArray(keys)) {
      if (keys.length === 0) {
        return;
      }
      await redis.del(...keys);
    } else {
      await redis.del(keys);
    }
  } catch (error) {
    console.error("Redis del failed", error);
  }
}
