import { TaskStatus, TaskPriority } from '@prisma/client';
import { PrismaService } from '../../src/prisma/prisma.service.js';

export async function createTestTask(
  prisma: PrismaService,
  projectId: string,
  overrides: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    milestoneId?: string;
    assigneeId?: string;
  } = {},
) {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return prisma.task.create({
    data: {
      projectId,
      title: overrides.title ?? `Task ${unique}`,
      description: overrides.description,
      status: overrides.status ?? TaskStatus.TODO,
      priority: overrides.priority ?? TaskPriority.MEDIUM,
      milestoneId: overrides.milestoneId,
      assigneeId: overrides.assigneeId,
    },
  });
}
