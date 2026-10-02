import { ProjectStatus, MilestoneStatus } from '@prisma/client';
import { TimelineStatus } from '../../projects/delivery-summary.types.js';
import { ClientProjectSerializer } from './client-project.serializer.js';
import { ClientDeliveryStatus } from '../dto/client-project-response.dto.js';

describe('ClientProjectSerializer', () => {
  describe('toClientDeliveryStatus', () => {
    it('should map TimelineStatus to ClientDeliveryStatus correctly', () => {
      expect(
        ClientProjectSerializer.toClientDeliveryStatus(
          TimelineStatus.NOT_STARTED,
        ),
      ).toBe(ClientDeliveryStatus.NOT_STARTED);
      expect(
        ClientProjectSerializer.toClientDeliveryStatus(TimelineStatus.ON_TRACK),
      ).toBe(ClientDeliveryStatus.ON_TRACK);
      expect(
        ClientProjectSerializer.toClientDeliveryStatus(TimelineStatus.AT_RISK),
      ).toBe(ClientDeliveryStatus.AT_RISK);
      expect(
        ClientProjectSerializer.toClientDeliveryStatus(TimelineStatus.CRITICAL),
      ).toBe(ClientDeliveryStatus.DELAYED);
      expect(
        ClientProjectSerializer.toClientDeliveryStatus(
          TimelineStatus.COMPLETED,
        ),
      ).toBe(ClientDeliveryStatus.COMPLETED);
    });
  });

  describe('serializeProject', () => {
    it('should sanitize project and omit financial and staffing data', () => {
      const now = new Date('2026-10-01T00:00:00.000Z');
      const later = new Date('2026-12-31T00:00:00.000Z');

      const serialized = ClientProjectSerializer.serializeProject({
        id: 'proj-1',
        name: 'Client Portal Portal',
        description: 'Customer facing delivery hub',
        status: ProjectStatus.ACTIVE,
        startDate: now,
        endDate: later,
        progress: 75,
        timelineStatus: TimelineStatus.ON_TRACK,
        milestoneStats: {
          total: 4,
          completed: 3,
          inProgress: 1,
          blocked: 0,
        },
      });

      expect(serialized).toEqual({
        id: 'proj-1',
        name: 'Client Portal Portal',
        description: 'Customer facing delivery hub',
        status: ProjectStatus.ACTIVE,
        startDate: now.toISOString(),
        endDate: later.toISOString(),
        progress: 75,
        timelineStatus: TimelineStatus.ON_TRACK,
        milestones: {
          total: 4,
          completed: 3,
          inProgress: 1,
          blocked: 0,
        },
      });

      // Explicitly check that forbidden keys are undefined
      expect(
        (serialized as Record<string, unknown>).totalBudget,
      ).toBeUndefined();
      expect(
        (serialized as Record<string, unknown>).costEntries,
      ).toBeUndefined();
      expect(
        (serialized as Record<string, unknown>).organizationId,
      ).toBeUndefined();
      expect((serialized as Record<string, unknown>).clientId).toBeUndefined();
    });
  });

  describe('serializeMilestone', () => {
    it('should serialize milestone safely', () => {
      const due = new Date('2026-11-15T00:00:00.000Z');
      const serialized = ClientProjectSerializer.serializeMilestone({
        id: 'm-1',
        name: 'Phase 1 MVP',
        description: 'Core functional deliverable',
        status: MilestoneStatus.IN_PROGRESS,
        startDate: null,
        dueDate: due,
        completedAt: null,
        progress: 80,
      });

      expect(serialized).toEqual({
        id: 'm-1',
        name: 'Phase 1 MVP',
        description: 'Core functional deliverable',
        status: MilestoneStatus.IN_PROGRESS,
        startDate: null,
        dueDate: due.toISOString(),
        completedAt: null,
        progress: 80,
      });

      expect((serialized as Record<string, unknown>).tasks).toBeUndefined();
      expect((serialized as Record<string, unknown>).projectId).toBeUndefined();
    });
  });
});
