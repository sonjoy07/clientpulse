import { ProjectStatus, MilestoneStatus } from '@prisma/client';
import { TimelineStatus } from '../../projects/delivery-summary.types.js';

export enum ClientDeliveryStatus {
  NOT_STARTED = 'NOT_STARTED',
  ON_TRACK = 'ON_TRACK',
  AT_RISK = 'AT_RISK',
  DELAYED = 'DELAYED',
  COMPLETED = 'COMPLETED',
}

export interface ClientMilestoneSummary {
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
}

export interface ClientProjectResponseDto {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  timelineStatus: TimelineStatus;
  milestones: ClientMilestoneSummary;
}

export interface ClientTimelineSummary {
  startDate: string | null;
  endDate: string | null;
  status: TimelineStatus;
  expectedProgress?: number;
  actualProgress?: number;
}

export interface ClientProjectProgressResponseDto {
  projectId: string;
  projectName: string;
  progress: number;
  status: ClientDeliveryStatus;
  milestones: ClientMilestoneSummary;
  timeline: ClientTimelineSummary;
}

export interface ClientMilestoneResponseDto {
  id: string;
  name: string;
  description: string | null;
  status: MilestoneStatus;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  progress: number;
}

export interface ClientDeliveryStatusResponseDto {
  projectId: string;
  projectName: string;
  status: ClientDeliveryStatus;
  progress: number;
  message: string;
}

export interface ClientDashboardResponseDto {
  client: {
    id: string;
    name: string;
    companyName: string;
  };
  summary: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
  };
  projects: ClientProjectResponseDto[];
}
