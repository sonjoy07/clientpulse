import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../queues/redis.service.js';

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  database?: string;
  dependencies?: {
    postgres: 'up' | 'down';
    redis: 'up' | 'down';
  };
}

export interface LivenessResponse {
  status: 'ok';
  service: string;
  timestamp: string;
  uptime: number;
}

export interface ReadinessResponse {
  status: 'ok' | 'error';
  service: string;
  timestamp: string;
  ready: boolean;
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'degraded';
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  getLiveness(): LivenessResponse {
    return {
      status: 'ok',
      service: 'clientpulse-api',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  async getReadiness(): Promise<ReadinessResponse> {
    const isDbHealthy = await this.prisma.isHealthy();
    const isRedisHealthy = await this.redisService.ping();

    if (!isDbHealthy) {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'clientpulse-api',
        timestamp: new Date().toISOString(),
        ready: false,
        checks: {
          database: 'error',
          redis: isRedisHealthy ? 'ok' : 'degraded',
        },
      });
    }

    return {
      status: 'ok',
      service: 'clientpulse-api',
      timestamp: new Date().toISOString(),
      ready: true,
      checks: {
        database: 'ok',
        redis: isRedisHealthy ? 'ok' : 'degraded',
      },
    };
  }

  async check(): Promise<HealthResponse> {
    const isDbHealthy = await this.prisma.isHealthy();

    if (!isDbHealthy) {
      const isRedisHealthy = await this.redisService.ping();
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'clientpulse-api',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        dependencies: {
          postgres: 'down',
          redis: isRedisHealthy ? 'up' : 'down',
        },
      });
    }

    const isRedisHealthy = await this.redisService.ping();

    return {
      status: 'ok',
      service: 'clientpulse-api',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dependencies: {
        postgres: 'up',
        redis: isRedisHealthy ? 'up' : 'down',
      },
    };
  }
}
