import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { QueuesModule } from '../queues/queues.module.js';
import { AiReportProcessor } from './processors/ai-report.processor.js';
import { AiReportsController } from './ai-reports.controller.js';
import { AiReportsService } from './ai-reports.service.js';
import { AiReportPromptService } from './services/ai-report-prompt.service.js';
import { AiReportValidatorService } from './services/ai-report-validator.service.js';
import { AiReportSnapshotService } from './services/ai-report-snapshot.service.js';
import { AiReportGeneratorService } from './services/ai-report-generator.service.js';
import { MockAiProvider } from './providers/mock-ai.provider.js';
import { OpenAiCompatibleProvider } from './providers/openai-compatible.provider.js';
import { AI_PROVIDER_TOKEN } from './interfaces/ai-provider.interface.js';

@Module({
  imports: [ConfigModule, PrismaModule, ProjectsModule, QueuesModule],
  controllers: [AiReportsController],
  providers: [
    AiReportPromptService,
    AiReportValidatorService,
    AiReportSnapshotService,
    AiReportGeneratorService,
    AiReportProcessor,
    AiReportsService,
    MockAiProvider,
    OpenAiCompatibleProvider,
    {
      provide: AI_PROVIDER_TOKEN,
      useFactory: (
        configService: ConfigService,
        mockProvider: MockAiProvider,
        openAiProvider: OpenAiCompatibleProvider,
      ) => {
        const provider = configService.get<string>('ai.provider') || 'mock';
        if (provider === 'openai') {
          return openAiProvider;
        }
        return mockProvider;
      },
      inject: [ConfigService, MockAiProvider, OpenAiCompatibleProvider],
    },
  ],
  exports: [
    AiReportsService,
    AiReportSnapshotService,
    AiReportValidatorService,
    AiReportPromptService,
    AiReportGeneratorService,
  ],
})
export class AiReportsModule {}
