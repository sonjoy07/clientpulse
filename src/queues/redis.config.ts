import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';

export function getRedisConfig(
  configService: ConfigService,
): ConnectionOptions & RedisOptions {
  const redisUrl =
    configService.get<string>('redis.url') || process.env.REDIS_URL;

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      const isTls = parsed.protocol === 'rediss:';
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 6379,
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      };
    } catch {
      // Fallback to individual fields if URL parse fails
    }
  }

  const host = configService.get<string>('redis.host') || 'localhost';
  const port = Number(configService.get<number>('redis.port')) || 6379;
  const password = configService.get<string>('redis.password') || undefined;
  const isTls =
    configService.get<string>('redis.tls') === 'true' ||
    process.env.REDIS_TLS === 'true' ||
    host.includes('upstash.io');

  return {
    host,
    port,
    password,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

