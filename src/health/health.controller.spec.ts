import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const mockHealthService = {
      check: jest.fn().mockResolvedValue({
        status: 'ok',
        service: 'clientpulse-api',
        timestamp: new Date().toISOString(),
        database: 'connected',
      }),
      getLiveness: jest.fn(),
      getReadiness: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check result', async () => {
    const checkSpy = jest.spyOn(service, 'check');
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('clientpulse-api');
    expect(checkSpy).toHaveBeenCalled();
  });

  it('should return liveness result', () => {
    const liveSpy = jest.spyOn(service, 'getLiveness').mockReturnValue({
      status: 'ok',
      service: 'clientpulse-api',
      timestamp: new Date().toISOString(),
      uptime: 42,
    });
    const result = controller.live();
    expect(result.status).toBe('ok');
    expect(result.uptime).toBe(42);
    expect(liveSpy).toHaveBeenCalled();
  });

  it('should return readiness result', async () => {
    const readySpy = jest.spyOn(service, 'getReadiness').mockResolvedValue({
      status: 'ok',
      service: 'clientpulse-api',
      timestamp: new Date().toISOString(),
      ready: true,
      checks: { database: 'ok', redis: 'ok' },
    });
    const result = await controller.ready();
    expect(result.ready).toBe(true);
    expect(result.checks.database).toBe('ok');
    expect(readySpy).toHaveBeenCalled();
  });
});
