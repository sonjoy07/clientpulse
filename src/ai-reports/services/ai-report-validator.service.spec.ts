import { BadRequestException } from '@nestjs/common';
import { AiReportValidatorService } from './ai-report-validator.service.js';

describe('AiReportValidatorService', () => {
  let service: AiReportValidatorService;

  beforeEach(() => {
    service = new AiReportValidatorService();
  });

  const validReportJson = JSON.stringify({
    summary:
      'Weekly executive status report: the project is on track with steady delivery progress.',
    highlights: [
      'Sprint goals met ahead of schedule.',
      'Code review completed.',
    ],
    achievements: ['Milestone Phase 1 completed.', 'Core API launched.'],
    concerns: ['Minor dependency delay.'],
    nextSteps: ['Commence Phase 2 integration.', 'Run security audit.'],
  });

  it('should validate and parse clean valid JSON', () => {
    const res = service.validate(validReportJson);
    expect(res.summary).toContain('Weekly executive status report');
    expect(res.highlights).toHaveLength(2);
    expect(res.achievements).toHaveLength(2);
    expect(res.concerns).toHaveLength(1);
    expect(res.nextSteps).toHaveLength(2);
  });

  it('should strip markdown code fences and validate successfully', () => {
    const wrapped = `\`\`\`json\n${validReportJson}\n\`\`\``;
    const res = service.validate(wrapped);
    expect(res.summary).toBeDefined();
    expect(res.highlights).toHaveLength(2);
  });

  it('should throw BadRequestException for empty or non-string input', () => {
    expect(() => service.validate('')).toThrow(BadRequestException);
    expect(() => service.validate(null as unknown as string)).toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException on malformed JSON', () => {
    expect(() => service.validate('{ broken json')).toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException when summary is too short', () => {
    const invalid = JSON.stringify({
      summary: 'Too short',
      highlights: ['Valid highlight'],
      achievements: ['Valid achievement'],
      concerns: [],
      nextSteps: ['Valid next step'],
    });
    expect(() => service.validate(invalid)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when highlights is empty', () => {
    const invalid = JSON.stringify({
      summary:
        'Weekly executive status report with sufficient character count.',
      highlights: [],
      achievements: ['Valid achievement'],
      concerns: [],
      nextSteps: ['Valid next step'],
    });
    expect(() => service.validate(invalid)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException when nextSteps is missing', () => {
    const invalid = JSON.stringify({
      summary:
        'Weekly executive status report with sufficient character count.',
      highlights: ['Valid highlight'],
      achievements: ['Valid achievement'],
      concerns: [],
    });
    expect(() => service.validate(invalid)).toThrow(BadRequestException);
  });

  it('should allow empty concerns list', () => {
    const jsonWithoutConcerns = JSON.stringify({
      summary:
        'Weekly executive status report with sufficient character count.',
      highlights: ['No active blockers.'],
      achievements: ['Delivered on schedule.'],
      concerns: [],
      nextSteps: ['Continue roadmap implementation.'],
    });
    const res = service.validate(jsonWithoutConcerns);
    expect(res.concerns).toEqual([]);
  });
});
