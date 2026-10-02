import { MilestoneStatus, ProjectStatus } from '@prisma/client';
import { TimelineStatus } from '../../projects/delivery-summary.types.js';
import {
  ClientDeliveryStatus,
  ClientProjectResponseDto,
  ClientMilestoneSummary,
  ClientMilestoneResponseDto,
  ClientDeliveryStatusResponseDto,
  ClientProjectProgressResponseDto,
} from '../dto/client-project-response.dto.js';

export class ClientProjectSerializer {
  static toClientDeliveryStatus(
    timelineStatus: TimelineStatus,
  ): ClientDeliveryStatus {
    switch (timelineStatus) {
      case TimelineStatus.NOT_STARTED:
        return ClientDeliveryStatus.NOT_STARTED;
      case TimelineStatus.ON_TRACK:
        return ClientDeliveryStatus.ON_TRACK;
      case TimelineStatus.AT_RISK:
        return ClientDeliveryStatus.AT_RISK;
      case TimelineStatus.CRITICAL:
        return ClientDeliveryStatus.DELAYED;
      case TimelineStatus.COMPLETED:
        return ClientDeliveryStatus.COMPLETED;
      default:
        return ClientDeliveryStatus.ON_TRACK;
    }
  }

  static getStatusMessage(status: ClientDeliveryStatus): string {
    switch (status) {
      case ClientDeliveryStatus.NOT_STARTED:
        return 'Project delivery has not started yet.';
      case ClientDeliveryStatus.ON_TRACK:
        return 'Project delivery is currently on track.';
      case ClientDeliveryStatus.AT_RISK:
        return 'Project delivery is experiencing minor schedule variance and is actively managed.';
      case ClientDeliveryStatus.DELAYED:
        return 'Project delivery has critical blockers and is currently delayed.';
      case ClientDeliveryStatus.COMPLETED:
        return 'Project delivery has been completed successfully.';
      default:
        return 'Project delivery status is active.';
    }
  }

  static serializeProject(data: {
    id: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    startDate: Date | null;
    endDate: Date | null;
    progress: number;
    timelineStatus: TimelineStatus;
    milestoneStats: {
      total: number;
      completed: number;
      inProgress: number;
      blocked: number;
    };
  }): ClientProjectResponseDto {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      startDate: data.startDate ? data.startDate.toISOString() : null,
      endDate: data.endDate ? data.endDate.toISOString() : null,
      progress: data.progress,
      timelineStatus: data.timelineStatus,
      milestones: {
        total: data.milestoneStats.total,
        completed: data.milestoneStats.completed,
        inProgress: data.milestoneStats.inProgress,
        blocked: data.milestoneStats.blocked,
      },
    };
  }

  static serializeMilestone(milestone: {
    id: string;
    name: string;
    description: string | null;
    status: MilestoneStatus;
    startDate: Date | null;
    dueDate: Date | null;
    completedAt: Date | null;
    progress: number;
  }): ClientMilestoneResponseDto {
    return {
      id: milestone.id,
      name: milestone.name,
      description: milestone.description,
      status: milestone.status,
      startDate: milestone.startDate ? milestone.startDate.toISOString() : null,
      dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
      completedAt: milestone.completedAt
        ? milestone.completedAt.toISOString()
        : null,
      progress: milestone.progress,
    };
  }

  static serializeProgress(data: {
    projectId: string;
    projectName: string;
    progress: number;
    timelineStatus: TimelineStatus;
    startDate: Date | null;
    endDate: Date | null;
    expectedProgress?: number;
    actualProgress?: number;
    milestones: ClientMilestoneSummary;
  }): ClientProjectProgressResponseDto {
    const status = this.toClientDeliveryStatus(data.timelineStatus);

    return {
      projectId: data.projectId,
      projectName: data.projectName,
      progress: data.progress,
      status,
      milestones: data.milestones,
      timeline: {
        startDate: data.startDate ? data.startDate.toISOString() : null,
        endDate: data.endDate ? data.endDate.toISOString() : null,
        status: data.timelineStatus,
        expectedProgress: data.expectedProgress,
        actualProgress: data.actualProgress,
      },
    };
  }

  static serializeDeliveryStatus(data: {
    projectId: string;
    projectName: string;
    timelineStatus: TimelineStatus;
    progress: number;
  }): ClientDeliveryStatusResponseDto {
    const status = this.toClientDeliveryStatus(data.timelineStatus);
    const message = this.getStatusMessage(status);

    return {
      projectId: data.projectId,
      projectName: data.projectName,
      status,
      progress: data.progress,
      message,
    };
  }
}
