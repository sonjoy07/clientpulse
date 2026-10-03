import { Injectable, BadRequestException } from '@nestjs/common';
import { AiReportOutput } from '../interfaces/ai-report-output.interface.js';

@Injectable()
export class AiReportValidatorService {
  /**
   * Cleans raw text from LLM by removing Markdown code fences if present.
   */
  cleanRawJson(raw: string): string {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/i, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '');
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/```$/, '');
    }
    return cleaned.trim();
  }

  /**
   * Validates and normalizes raw LLM output into an AiReportOutput structure.
   */
  validate(rawOutput: string): AiReportOutput {
    if (!rawOutput || typeof rawOutput !== 'string') {
      throw new BadRequestException('AI provider returned empty response');
    }

    const cleaned = this.cleanRawJson(rawOutput);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(
        `Failed to parse AI output as JSON: ${msg}`,
      );
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('AI report must be a JSON object');
    }

    // 1. Summary validation
    if (typeof parsed.summary !== 'string') {
      throw new BadRequestException(
        'AI report "summary" must be a non-empty string',
      );
    }
    const summary = parsed.summary.trim();
    if (summary.length < 20 || summary.length > 2500) {
      throw new BadRequestException(
        `AI report "summary" length (${summary.length}) must be between 20 and 2500 characters`,
      );
    }

    // 2. Validate string arrays
    const validateStringArray = (
      field: string,
      arr: unknown,
      minItems = 1,
      maxItems = 10,
    ): string[] => {
      if (!Array.isArray(arr)) {
        throw new BadRequestException(`AI report "${field}" must be an array`);
      }
      const sanitized: string[] = arr
        .map((item: unknown) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0);

      if (sanitized.length < minItems) {
        throw new BadRequestException(
          `AI report "${field}" must contain at least ${minItems} item(s)`,
        );
      }
      if (sanitized.length > maxItems) {
        throw new BadRequestException(
          `AI report "${field}" cannot contain more than ${maxItems} items`,
        );
      }
      for (const item of sanitized) {
        if (item.length < 3 || item.length > 600) {
          throw new BadRequestException(
            `Item in AI report "${field}" length (${item.length}) must be between 3 and 600 characters`,
          );
        }
      }
      return sanitized;
    };

    const highlights = validateStringArray(
      'highlights',
      parsed.highlights,
      1,
      10,
    );
    const achievements = validateStringArray(
      'achievements',
      parsed.achievements,
      1,
      10,
    );
    const concerns = validateStringArray('concerns', parsed.concerns, 0, 10);
    const nextSteps = validateStringArray('nextSteps', parsed.nextSteps, 1, 10);

    return {
      summary,
      highlights,
      achievements,
      concerns,
      nextSteps,
    };
  }
}
