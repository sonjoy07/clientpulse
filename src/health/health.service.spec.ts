import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../queues/redis.service.js';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: { isHealthy: jest.Mock };
  let redisService: { ping: jest.Mock };

  beforeEach(async () => {
    prisma = {
      isHealthy: jest.fn(),
    };
    redisService = {
      ping: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should return ok when both postgres and redis are up', async () => {
    prisma.isHealthy.mockResolvedValue(true);
    redisService.ping.mockResolvedValue(true);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.dependencies).toEqual({
      postgres: 'up',
      redis: 'up',
    });
  });

  it('should return ok when redis is down but postgres is up (graceful degradation)', async () => {
    prisma.isHealthy.mockResolvedValue(true);
    redisService.ping.mockResolvedValue(false);

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.dependencies).toEqual({
      postgres: 'up',
      redis: 'down',
    });
  });

  it('should throw ServiceUnavailableException when postgres is down', async () => {
    prisma.isHealthy.mockResolvedValue(false);
    redisService.ping.mockResolvedValue(true);

    await expect(service.check()).rejects.toThrow(ServiceUnavailableException);
  });

  describe('getLiveness', () => {
    it('should return process liveness status', () => {
      const result = service.getLiveness();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('clientpulse-api');
      expect(typeof result.uptime).toBe('number');
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('getReadiness', () => {
    it('should return ready when postgres and redis are healthy', async () => {
      prisma.isHealthy.mockResolvedValue(true);
      redisService.ping.mockResolvedValue(true);

      const result = await service.getReadiness();
      expect(result.status).toBe('ok');
      expect(result.ready).toBe(true);
      expect(result.checks).toEqual({
        database: 'ok',
        redis: 'ok',
      });
    });

    it('should return ready with degraded redis when postgres is up', async () => {
      prisma.isHealthy.mockResolvedValue(true);
      redisService.ping.mockResolvedValue(false);

      const result = await service.getReadiness();
      expect(result.status).toBe('ok');
      expect(result.ready).toBe(true);
      expect(result.checks).toEqual({
        database: 'ok',
        redis: 'degraded',
      });
    });

    it('should throw ServiceUnavailableException when postgres is down', async () => {
      prisma.isHealthy.mockResolvedValue(false);
      redisService.ping.mockResolvedValue(true);

      await expect(service.getReadiness()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
