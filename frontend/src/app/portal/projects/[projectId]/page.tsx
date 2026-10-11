'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { clientPortalApi } from '@/lib/api/services';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Milestone as MilestoneIcon,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/cn';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ClientProjectDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;
  const [activeTab, setActiveTab] = useState<'milestones' | 'reports'>('milestones');

  const { data: projectRes, isLoading: loadingProject } = useQuery({
    queryKey: ['client-portal-project', projectId],
    queryFn: () => clientPortalApi.getProject(projectId),
    enabled: !!projectId,
  });

  const { data: milestonesRes, isLoading: loadingMilestones } = useQuery({
    queryKey: ['client-portal-milestones', projectId],
    queryFn: () => clientPortalApi.getMilestones(projectId),
    enabled: !!projectId,
  });

  const { data: reportsRes, isLoading: loadingReports } = useQuery({
    queryKey: ['client-portal-reports', projectId],
    queryFn: () => clientPortalApi.getReports(projectId),
    enabled: !!projectId,
  });

  if (loadingProject) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const project = projectRes?.data;

  if (!project) {
    return (
      <div className="p-8 text-center space-y-4 bg-card rounded-xl border">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-semibold">Project Not Found</h2>
        <p className="text-sm text-muted-foreground">
          This project could not be found or you may not have access to view it.
        </p>
        <Link href="/portal/projects">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const timeline = project.timelineStatus || 'ON_TRACK';
  const progress = project.progress || 0;
  const milestones = milestonesRes?.data || [];
  const reports = reportsRes?.data || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/portal/projects">
          <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Projects
          </Button>
        </Link>
      </div>

      {/* Project Header Banner */}
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {project.name}
                </h1>
                <Badge
                  variant={
                    timeline === 'AHEAD_OF_SCHEDULE'
                      ? 'default'
                      : timeline === 'DELAYED'
                      ? 'destructive'
                      : 'secondary'
                  }
                  className="text-xs"
                >
                  {timeline.replace('_', ' ')}
                </Badge>
              </div>

              {project.description && (
                <p className="text-sm text-muted-foreground max-w-3xl">
                  {project.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Timeline: {formatDate(project.startDate)} – {formatDate(project.endDate)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Progress Bar */}
            <div className="w-full md:w-64 shrink-0 bg-muted/40 p-4 rounded-lg border">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-medium text-muted-foreground">Delivery Completion</span>
                <span className="font-bold text-base text-foreground">{progress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'milestones'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <MilestoneIcon className="w-4 h-4" />
          <span>Milestones ({milestones.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 pb-3 px-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'reports'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Weekly Status Reports ({reports.length})</span>
        </button>
      </div>

      {/* Tab Content: Milestones */}
      {activeTab === 'milestones' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Delivery Milestones</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingMilestones ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : milestones.length === 0 ? (
              <div className="p-12 text-center">
                <MilestoneIcon className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No milestones defined yet</p>
                <p className="text-xs text-muted-foreground mt-1">Milestones will appear here once planned.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {milestones.map((m: any) => (
                  <div key={m.id} className="p-4 sm:p-5 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-sm text-foreground">{m.name}</span>
                        <Badge
                          variant={
                            m.status === 'COMPLETED'
                              ? 'default'
                              : m.status === 'BLOCKED'
                              ? 'destructive'
                              : m.status === 'IN_PROGRESS'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-[11px]"
                        >
                          {m.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {m.description && (
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground block">Target Due</span>
                      <span className="text-xs font-medium text-foreground">{formatDate(m.dueDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab Content: Status Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {loadingReports ? (
            <Skeleton className="h-48 w-full" />
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No status reports available yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Weekly automated reports generated by the project team will be published here.
                </p>
              </CardContent>
            </Card>
          ) : (
            reports.map((report: any) => {
              const content = report.reportContent || {};
              return (
                <Card key={report.id} className="border-border">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">
                          Weekly Status Report ({formatDate(report.periodStart)} – {formatDate(report.periodEnd)})
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="text-[11px]">
                        Published {formatDate(report.createdAt)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {content.summary && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">
                          Executive Summary
                        </h4>
                        <p className="text-sm text-foreground leading-relaxed bg-muted/30 p-3 rounded-md">
                          {content.summary}
                        </p>
                      </div>
                    )}

                    {content.achievements && content.achievements.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                          Key Deliverables Completed
                        </h4>
                        <ul className="space-y-1.5">
                          {content.achievements.map((item: string, i: number) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {content.nextSteps && content.nextSteps.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">
                          Next Steps & Priorities
                        </h4>
                        <ul className="space-y-1.5">
                          {content.nextSteps.map((step: string, i: number) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-2">
                              <Clock className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
