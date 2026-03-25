// lib/redis.ts
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const isRedisEnabled = Boolean(redisUrl && redisToken);

export const redis = isRedisEnabled
  ? new Redis({
      url: redisUrl as string,
      token: redisToken as string,
    })
  : null;
