import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueMonitorService } from './queue-monitor.service.js';
import { QUEUES } from './queues.constants.js';

describe('QueueMonitorService', () => {
  let service: QueueMonitorService;
  let queue: {
    getWaitingCount: jest.Mock;
    getActiveCount: jest.Mock;
    getCompletedCount: jest.Mock;
    getFailedCount: jest.Mock;
    getDelayedCount: jest.Mock;
  };

  beforeEach(async () => {
    queue = {
      getWaitingCount: jest.fn().mockResolvedValue(2),
      getActiveCount: jest.fn().mockResolvedValue(1),
      getCompletedCount: jest.fn().mockResolvedValue(10),
      getFailedCount: jest.fn().mockResolvedValue(0),
      getDelayedCount: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueMonitorService,
        { provide: getQueueToken(QUEUES.AI_REPORT), useValue: queue },
      ],
    }).compile();

    service = module.get<QueueMonitorService>(QueueMonitorService);
  });

  it('should return aggregated queue metrics', async () => {
    const metrics = await service.getAiReportQueueMetrics();

    expect(metrics).toEqual({
      queue: QUEUES.AI_REPORT,
      waiting: 2,
      active: 1,
      completed: 10,
      failed: 0,
      delayed: 0,
    });
    expect(queue.getWaitingCount).toHaveBeenCalled();
    expect(queue.getActiveCount).toHaveBeenCalled();
    expect(queue.getCompletedCount).toHaveBeenCalled();
    expect(queue.getFailedCount).toHaveBeenCalled();
    expect(queue.getDelayedCount).toHaveBeenCalled();
  });
});
