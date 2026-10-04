import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service.js';

const mockPing = jest.fn();
const mockQuit = jest.fn();
const mockOn = jest.fn();

jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => {
      return {
        ping: mockPing,
        quit: mockQuit,
        on: mockOn,
      };
    }),
  };
});

describe('RedisService', () => {
  let service: RedisService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'redis.host') return 'localhost';
        if (key === 'redis.port') return 6379;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should return true when ping returns PONG', async () => {
    mockPing.mockResolvedValue('PONG');
    const result = await service.ping();
    expect(result).toBe(true);
  });

  it('should return false when ping fails or rejects', async () => {
    mockPing.mockRejectedValue(new Error('Connection timeout'));
    const result = await service.ping();
    expect(result).toBe(false);
  });

  it('should quit redis client onModuleDestroy', async () => {
    mockQuit.mockResolvedValue('OK');
    await service.onModuleDestroy();
    expect(mockQuit).toHaveBeenCalled();
  });
});
