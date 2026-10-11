'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Edit2,
  FolderKanban,
  LayoutDashboard,
  CheckSquare,
  Milestone,
  Users,
  DollarSign,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { projectsApi } from '@/lib/api/services';
import { useAuth } from '@/lib/auth/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectOverviewTab } from '@/components/projects/ProjectOverviewTab';
import { ProjectTasksTab } from '@/components/projects/ProjectTasksTab';
import { ProjectMilestonesTab } from '@/components/projects/ProjectMilestonesTab';
import { ProjectTeamTab } from '@/components/projects/ProjectTeamTab';
import { ProjectBudgetTab } from '@/components/projects/ProjectBudgetTab';
import { ProjectRisksTab } from '@/components/projects/ProjectRisksTab';
import { ProjectAiReportsTab } from '@/components/projects/ProjectAiReportsTab';

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { hasRole, isClient } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'tasks' | 'milestones' | 'team' | 'budget' | 'risks' | 'reports'
  >('overview');

  const canEdit = hasRole(['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER']);
  const canViewBudget = hasRole(['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD']);
  const canViewInternalRisks = !isClient;

  const { data: projectRes, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  });

  const project = projectRes?.data;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'milestones', label: 'Milestones', icon: Milestone },
    { id: 'team', label: 'Team', icon: Users },
    ...(canViewBudget ? [{ id: 'budget', label: 'Budget', icon: DollarSign }] : []),
    ...(canViewInternalRisks ? [{ id: 'risks', label: 'Risks & Health', icon: AlertTriangle }] : []),
    ...(canViewInternalRisks ? [{ id: 'reports', label: 'AI Reports', icon: Sparkles }] : []),
  ];

  return (
    <DashboardLayout
      title={project?.name || 'Project Dashboard'}
      description={project?.client ? `Client: ${project.client.companyName || project.client.name}` : undefined}
    >
      <div className="space-y-6">
        {/* Top Header Breadcrumbs & Quick Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Projects Portfolio
          </Link>

          {canEdit && project && (
            <Link href={`/projects/${project.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Edit2 className="h-3.5 w-3.5" />
                Edit Settings
              </Button>
            </Link>
          )}
        </div>

        {/* Project Header Card */}
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded-xl" />
        ) : project ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight text-foreground">{project.name}</h2>
                <Badge
                  variant={
                    project.status === 'ACTIVE'
                      ? 'default'
                      : project.status === 'COMPLETED'
                      ? 'healthy'
                      : project.status === 'ON_HOLD'
                      ? 'atRisk'
                      : 'muted'
                  }
                  className="text-xs"
                >
                  {project.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Account: {project.client?.companyName || project.client?.name || 'Internal'}
              </p>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100/80 rounded-lg border border-border/60">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Tab Content Display */}
        {project && (
          <div className="pt-2">
            {activeTab === 'overview' && (
              <ProjectOverviewTab project={project} canViewBudget={canViewBudget} />
            )}
            {activeTab === 'tasks' && (
              <ProjectTasksTab projectId={project.id} canManage={canEdit} />
            )}
            {activeTab === 'milestones' && (
              <ProjectMilestonesTab projectId={project.id} canManage={canEdit} />
            )}
            {activeTab === 'team' && (
              <ProjectTeamTab projectId={project.id} canManage={canEdit} />
            )}
            {activeTab === 'budget' && canViewBudget && (
              <ProjectBudgetTab projectId={project.id} canManage={canEdit} />
            )}
            {activeTab === 'risks' && canViewInternalRisks && (
              <ProjectRisksTab projectId={project.id} />
            )}
            {activeTab === 'reports' && canViewInternalRisks && (
              <ProjectAiReportsTab projectId={project.id} canGenerate={canEdit} />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
