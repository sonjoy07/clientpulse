import { ProjectStatus } from '@prisma/client';
import {
  calculateTimelineStatus,
  TimelineStatus,
} from './delivery-summary.types.js';

describe('calculateTimelineStatus', () => {
  const startDate = new Date('2026-01-01T00:00:00.000Z');
  const endDate = new Date('2026-05-01T00:00:00.000Z'); // ~120 days total

  it('should return COMPLETED when project status is COMPLETED', () => {
    const result = calculateTimelineStatus(
      ProjectStatus.COMPLETED,
      startDate,
      endDate,
      100,
    );
    expect(result.status).toBe(TimelineStatus.COMPLETED);
    expect(result.expectedProgress).toBe(100);
    expect(result.actualProgress).toBe(100);
  });

  it('should return ON_TRACK with expectedProgress 0 when dates are not configured', () => {
    const result = calculateTimelineStatus(
      ProjectStatus.ACTIVE,
      null,
      null,
      40,
    );
    expect(result.status).toBe(TimelineStatus.ON_TRACK);
    expect(result.expectedProgress).toBe(0);
  });

  it('should return NOT_STARTED when now is before startDate', () => {
    const nowBefore = new Date('2025-12-01T00:00:00.000Z');
    const result = calculateTimelineStatus(
      ProjectStatus.ACTIVE,
      startDate,
      endDate,
      0,
      nowBefore,
    );
    expect(result.status).toBe(TimelineStatus.NOT_STARTED);
    expect(result.expectedProgress).toBe(0);
  });

  it('should return ON_TRACK when actual progress is within 10% of expected progress', () => {
    // Halfway through: expectedProgress = 50%
    const nowHalf = new Date('2026-03-02T00:00:00.000Z');
    const result = calculateTimelineStatus(
      ProjectStatus.ACTIVE,
      startDate,
      endDate,
      45, // 45 >= 50 - 10 (40)
      nowHalf,
    );
    expect(result.status).toBe(TimelineStatus.ON_TRACK);
    expect(result.expectedProgress).toBe(50);
  });

  it('should return AT_RISK when actual progress is between 11% and 25% behind expected progress', () => {
    // Halfway through: expectedProgress = 50%
    const nowHalf = new Date('2026-03-02T00:00:00.000Z');
    const result = calculateTimelineStatus(
      ProjectStatus.ACTIVE,
      startDate,
      endDate,
      30, // 30 is between 25 and 39
      nowHalf,
    );
    expect(result.status).toBe(TimelineStatus.AT_RISK);
    expect(result.expectedProgress).toBe(50);
  });

  it('should return CRITICAL when actual progress is more than 25% behind expected progress', () => {
    // Halfway through: expectedProgress = 50%
    const nowHalf = new Date('2026-03-02T00:00:00.000Z');
    const result = calculateTimelineStatus(
      ProjectStatus.ACTIVE,
      startDate,
      endDate,
      15, // 15 < 50 - 25 (25)
      nowHalf,
    );
    expect(result.status).toBe(TimelineStatus.CRITICAL);
    expect(result.expectedProgress).toBe(50);
  });

  it('should handle zero duration gracefully', () => {
    const sameDate = new Date('2026-01-01T00:00:00.000Z');
    const result = calculateTimelineStatus(
      ProjectStatus.ACTIVE,
      sameDate,
      sameDate,
      50,
      sameDate,
    );
    expect(result.expectedProgress).toBe(100);
  });
});
