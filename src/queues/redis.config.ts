import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';

export function getRedisConfig(
  configService: ConfigService,
): ConnectionOptions & RedisOptions {
  return {
    host: configService.get<string>('redis.host') || 'localhost',
    port: configService.get<number>('redis.port') || 6379,
    password: configService.get<string>('redis.password') || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
