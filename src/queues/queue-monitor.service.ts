import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { QUEUES } from './queues.constants.js';

export interface QueueMetrics {
  queue: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed?: number;
}

@Injectable()
export class QueueMonitorService {
  private readonly logger = new Logger(QueueMonitorService.name);

  constructor(
    @InjectQueue(QUEUES.AI_REPORT)
    private readonly aiReportQueue: Queue,
  ) {}

  async getAiReportQueueMetrics(): Promise<QueueMetrics> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.aiReportQueue.getWaitingCount(),
      this.aiReportQueue.getActiveCount(),
      this.aiReportQueue.getCompletedCount(),
      this.aiReportQueue.getFailedCount(),
      this.aiReportQueue.getDelayedCount(),
    ]);

    return {
      queue: QUEUES.AI_REPORT,
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }
}
