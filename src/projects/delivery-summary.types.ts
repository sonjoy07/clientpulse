import { ProjectStatus } from '@prisma/client';

export enum TimelineStatus {
  NOT_STARTED = 'NOT_STARTED',
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  CRITICAL = 'CRITICAL',
  COMPLETED = 'COMPLETED',
}

export interface DeliverySummary {
  projectId: string;
  projectName: string;
  progress: number;
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    blocked: number;
    done: number;
  };
  milestones: {
    total: number;
    completed: number;
    inProgress: number;
    blocked: number;
    pending: number;
  };
  timeline: {
    status: TimelineStatus;
    expectedProgress: number;
    actualProgress: number;
  };
}

export function calculateTimelineStatus(
  projectStatus: ProjectStatus,
  startDate: Date | null,
  endDate: Date | null,
  actualProgress: number,
  now: Date = new Date(),
): {
  status: TimelineStatus;
  expectedProgress: number;
  actualProgress: number;
} {
  if (projectStatus === ProjectStatus.COMPLETED) {
    return {
      status: TimelineStatus.COMPLETED,
      expectedProgress: 100,
      actualProgress,
    };
  }

  if (!startDate || !endDate) {
    return {
      status: TimelineStatus.ON_TRACK,
      expectedProgress: 0,
      actualProgress,
    };
  }

  if (now < startDate) {
    return {
      status: TimelineStatus.NOT_STARTED,
      expectedProgress: 0,
      actualProgress,
    };
  }

  const totalDuration = endDate.getTime() - startDate.getTime();
  let expectedProgress = 100;
  if (totalDuration > 0) {
    const elapsed = now.getTime() - startDate.getTime();
    expectedProgress = Math.round(
      Math.min(100, Math.max(0, (elapsed / totalDuration) * 100)),
    );
  }

  let status: TimelineStatus;
  if (actualProgress >= expectedProgress - 10) {
    status = TimelineStatus.ON_TRACK;
  } else if (actualProgress >= expectedProgress - 25) {
    status = TimelineStatus.AT_RISK;
  } else {
    status = TimelineStatus.CRITICAL;
  }

  return {
    status,
    expectedProgress,
    actualProgress,
  };
}
