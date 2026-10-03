import { Injectable, Inject, Logger } from '@nestjs/common';
import { AI_PROVIDER_TOKEN } from '../interfaces/ai-provider.interface.js';
import type { AiProvider } from '../interfaces/ai-provider.interface.js';
import { AiReportOutput } from '../interfaces/ai-report-output.interface.js';
import { ProjectReportSnapshot } from '../interfaces/project-report-snapshot.interface.js';
import { AiReportPromptService } from './ai-report-prompt.service.js';
import { AiReportValidatorService } from './ai-report-validator.service.js';

export interface GeneratedReportResult {
  output: AiReportOutput;
  model: string;
}

@Injectable()
export class AiReportGeneratorService {
  private readonly logger = new Logger(AiReportGeneratorService.name);

  constructor(
    @Inject(AI_PROVIDER_TOKEN)
    private readonly aiProvider: AiProvider,
    private readonly promptService: AiReportPromptService,
    private readonly validatorService: AiReportValidatorService,
  ) {}

  async generate(
    snapshot: ProjectReportSnapshot,
    maxRetries = 3,
    initialBackoffMs = 200,
  ): Promise<GeneratedReportResult> {
    const systemPrompt = this.promptService.buildSystemPrompt();
    const userPrompt = this.promptService.buildUserPrompt(snapshot);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const rawContent = await this.aiProvider.generateReport(
          systemPrompt,
          userPrompt,
        );
        const validatedOutput = this.validatorService.validate(rawContent);

        return {
          output: validatedOutput,
          model: this.aiProvider.modelName,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        lastError = error;
        this.logger.warn(
          `AI Report generation attempt ${attempt}/${maxRetries} failed: ${error.message}`,
        );

        if (attempt < maxRetries) {
          const delay = initialBackoffMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to generate valid AI report after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
    );
  }
}
