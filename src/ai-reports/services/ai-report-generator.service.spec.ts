import { AiReportGeneratorService } from './ai-report-generator.service.js';
import { AiReportPromptService } from './ai-report-prompt.service.js';
import { AiReportValidatorService } from './ai-report-validator.service.js';
import { AiProvider } from '../interfaces/ai-provider.interface.js';
import { ProjectReportSnapshot } from '../interfaces/project-report-snapshot.interface.js';

describe('AiReportGeneratorService', () => {
  let service: AiReportGeneratorService;
  let mockProvider: jest.Mocked<AiProvider>;
  let promptService: AiReportPromptService;
  let validatorService: AiReportValidatorService;

  const sampleSnapshot: ProjectReportSnapshot = {
    projectId: 'proj-1',
    projectName: 'Test Project',
    clientName: 'Test Client',
    period: { startDate: '2026-03-01', endDate: '2026-03-07' },
    delivery: {
      progressPercentage: 50,
      tasks: { total: 10, completed: 5, inProgress: 3, blocked: 0, todo: 2 },
    },
    milestones: {
      total: 2,
      completed: 1,
      inProgress: 1,
      blocked: 0,
      pending: 0,
      milestones: [],
    },
    budget: { hasBudget: false },
    timeline: {
      status: 'ON_TRACK',
      startDate: null,
      endDate: null,
      isDelayed: false,
    },
    blockers: [],
  };

  const validJson = JSON.stringify({
    summary:
      'Weekly executive status report for Test Project: delivery is moving steadily.',
    highlights: ['Highlights 1', 'Highlights 2'],
    achievements: ['Achievement 1'],
    concerns: [],
    nextSteps: ['Next step 1'],
  });

  let generateSpy: jest.Mock;

  beforeEach(() => {
    generateSpy = jest.fn();
    mockProvider = {
      modelName: 'test-model',
      generateReport: generateSpy,
    };
    promptService = new AiReportPromptService();
    validatorService = new AiReportValidatorService();

    service = new AiReportGeneratorService(
      mockProvider,
      promptService,
      validatorService,
    );
  });

  it('should generate report on first attempt successfully', async () => {
    generateSpy.mockResolvedValueOnce(validJson);

    const result = await service.generate(sampleSnapshot, 3, 10);

    expect(result.model).toBe('test-model');
    expect(result.output.summary).toContain('Weekly executive status report');
    expect(generateSpy).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed if subsequent attempt passes', async () => {
    generateSpy
      .mockRejectedValueOnce(new Error('Network glitch'))
      .mockResolvedValueOnce(validJson);

    const result = await service.generate(sampleSnapshot, 3, 10);

    expect(result.model).toBe('test-model');
    expect(generateSpy).toHaveBeenCalledTimes(2);
  });

  it('should throw an error after max retries are exhausted', async () => {
    generateSpy.mockRejectedValue(new Error('Persistent provider failure'));

    await expect(service.generate(sampleSnapshot, 2, 5)).rejects.toThrow(
      'Failed to generate valid AI report after 2 attempts',
    );
    expect(generateSpy).toHaveBeenCalledTimes(2);
  });
});
