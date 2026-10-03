import { Injectable } from '@nestjs/common';
import { AiProvider } from '../interfaces/ai-provider.interface.js';
import { ProjectReportSnapshot } from '../interfaces/project-report-snapshot.interface.js';

@Injectable()
export class MockAiProvider implements AiProvider {
  readonly modelName = 'mock-llm-v1';

  async generateReport(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    await Promise.resolve();

    // Attempt to extract snapshot from userPrompt
    let snapshot: ProjectReportSnapshot | null = null;
    const match = userPrompt.match(
      /<UNTRUSTED_PROJECT_DATA>([\s\S]*?)<\/UNTRUSTED_PROJECT_DATA>/,
    );
    if (match && match[1]) {
      try {
        snapshot = JSON.parse(match[1].trim()) as ProjectReportSnapshot;
      } catch {
        // Fallback if parsing fails
      }
    }

    const projectName = snapshot?.projectName || 'Project';
    const clientName = snapshot?.clientName || 'Valued Client';
    const progress = snapshot?.delivery.progressPercentage ?? 0;
    const timelineStatus = snapshot?.timeline.status ?? 'ACTIVE';
    const completedTasks = snapshot?.delivery.tasks.completed ?? 0;
    const totalTasks = snapshot?.delivery.tasks.total ?? 0;
    const completedMilestones = snapshot?.milestones.completed ?? 0;
    const totalMilestones = snapshot?.milestones.total ?? 0;
    const blockers = snapshot?.blockers ?? [];

    const summary = `Weekly project delivery report for ${projectName} (${clientName}). The team has achieved ${progress}% overall delivery completion. Current timeline health is ${timelineStatus}. A total of ${completedTasks} of ${totalTasks} tasks have been completed, and ${completedMilestones} of ${totalMilestones} milestones have been achieved.`;

    const highlights = [
      `Overall project completion is at ${progress}%.`,
      `Timeline status is currently ${timelineStatus}.`,
      `Active tracking includes ${totalTasks} tasks across ${totalMilestones} project milestones.`,
    ];

    const achievements = [
      `Successfully delivered ${completedTasks} tasks towards project goals.`,
      `Completed ${completedMilestones} major project milestones.`,
    ];

    const concerns =
      blockers.length > 0
        ? blockers.slice(0, 3).map((b) => `Active attention required: ${b}`)
        : [];

    const nextSteps = [
      'Continue sprint execution focusing on upcoming milestone deliverables.',
      'Conduct regular review check-ins with client stakeholders on pending deliverables.',
    ];

    const result = {
      summary,
      highlights,
      achievements,
      concerns,
      nextSteps,
    };

    return JSON.stringify(result, null, 2);
  }
}
