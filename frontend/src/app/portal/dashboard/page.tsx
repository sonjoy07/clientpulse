'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { clientPortalApi } from '@/lib/api/services';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Building,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/cn';

export default function ClientPortalDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-portal-dashboard'],
    queryFn: () => clientPortalApi.getDashboard(),
  });

  const dashboard = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-8 text-center space-y-4 bg-card rounded-xl border">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-lg font-semibold">Unable to Load Client Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          {(error as any)?.message || 'Please check your connection or contact your agency project manager.'}
        </p>
      </div>
    );
  }

  const { client, totalProjects, activeProjects, completedProjects, projects } = dashboard;

  // Calculate average progress
  const avgProgress =
    projects.length > 0
      ? Math.round(
          projects.reduce((acc, p) => acc + (p.progress || 0), 0) / projects.length,
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
              <Building className="w-3.5 h-3.5" />
              {client.companyName || client.name}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {client.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Track your active delivery milestones, verify deliverables, and review automated progress reports in real time.
            </p>
          </div>
          <Link href="/portal/projects">
            <Button className="shrink-0 gap-2 shadow-xs">
              View All Projects
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Projects</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{totalProjects}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <FolderKanban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Delivery</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{activeProjects}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{completedProjects}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Progress</p>
              <p className="text-2xl font-bold text-foreground mt-1">{avgProgress}%</p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Current Projects
          </h2>
          <Link href="/portal/projects" className="text-xs font-medium text-primary hover:underline">
            See all ({projects.length})
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <h3 className="text-base font-semibold">No active projects</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your agency partner hasn't assigned any active projects yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((proj: any) => {
              const timeline = proj.timelineStatus || 'ON_TRACK';
              const milestones = proj.milestoneStats || { total: 0, completed: 0 };

              return (
                <Card key={proj.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-semibold text-foreground">
                          {proj.name}
                        </CardTitle>
                        {proj.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {proj.description}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          timeline === 'AHEAD_OF_SCHEDULE'
                            ? 'default'
                            : timeline === 'DELAYED'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs shrink-0"
                      >
                        {timeline.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    {/* Delivery Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Delivery Completion</span>
                        <span className="font-semibold text-foreground">{proj.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(proj.progress || 0, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Timeline & Milestones Meta */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Timeline</span>
                        <span className="font-medium text-foreground">
                          {formatDate(proj.startDate)} - {formatDate(proj.endDate)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Milestones</span>
                        <span className="font-medium text-foreground">
                          {milestones.completed} / {milestones.total} completed
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Link href={`/portal/projects/${proj.id}`} className="w-full">
                        <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                          <span>View Project & Reports</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
