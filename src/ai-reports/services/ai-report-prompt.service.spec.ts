import { AiReportPromptService } from './ai-report-prompt.service.js';
import { ProjectReportSnapshot } from '../interfaces/project-report-snapshot.interface.js';

describe('AiReportPromptService', () => {
  let service: AiReportPromptService;

  beforeEach(() => {
    service = new AiReportPromptService();
  });

  const sampleSnapshot: ProjectReportSnapshot = {
    projectId: 'proj-123',
    projectName: 'Acme Portal',
    clientName: 'Acme Corp',
    period: {
      startDate: '2026-03-01',
      endDate: '2026-03-07',
    },
    delivery: {
      progressPercentage: 65,
      tasks: {
        total: 20,
        completed: 13,
        inProgress: 5,
        blocked: 1,
        todo: 1,
      },
    },
    milestones: {
      total: 3,
      completed: 1,
      inProgress: 2,
      blocked: 0,
      pending: 0,
      milestones: [
        {
          name: 'Milestone 1',
          status: 'COMPLETED',
          dueDate: '2026-03-05',
        },
      ],
    },
    budget: {
      hasBudget: true,
      totalBudget: 50000,
      spent: 25000,
      remaining: 25000,
      currency: 'USD',
      utilizationPercentage: 50,
      burnRateStatus: 'NORMAL',
    },
    timeline: {
      status: 'ON_TRACK',
      startDate: '2026-02-01',
      endDate: '2026-04-01',
      isDelayed: false,
    },
    blockers: ['Task blocked: Auth Token Refactor'],
  };

  it('should build system prompt containing persona and prompt injection defenses', () => {
    const prompt = service.buildSystemPrompt();
    expect(prompt).toContain('Senior Project Delivery Director');
    expect(prompt).toContain('Prompt Injection Defense');
    expect(prompt).toContain('<UNTRUSTED_PROJECT_DATA>');
    expect(prompt).toContain('summary');
    expect(prompt).toContain('highlights');
    expect(prompt).toContain('achievements');
    expect(prompt).toContain('concerns');
    expect(prompt).toContain('nextSteps');
  });

  it('should build user prompt containing sanitized snapshot within untrusted tags', () => {
    const userPrompt = service.buildUserPrompt(sampleSnapshot);
    expect(userPrompt).toContain('<UNTRUSTED_PROJECT_DATA>');
    expect(userPrompt).toContain('Acme Portal');
    expect(userPrompt).toContain('Acme Corp');
    expect(userPrompt).toContain('</UNTRUSTED_PROJECT_DATA>');
  });
});
