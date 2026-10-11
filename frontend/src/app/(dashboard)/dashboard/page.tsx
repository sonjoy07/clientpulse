'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { projectsApi, clientsApi, resourcesApi } from '@/lib/api/services';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils/cn';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function InternalDashboardPage() {
  // Fetch real projects
  const { data: projectsRes, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects', 'dashboard-list'],
    queryFn: () => projectsApi.list({ limit: 100 }),
  });

  // Fetch real clients
  const { data: clientsRes, isLoading: loadingClients } = useQuery({
    queryKey: ['clients', 'dashboard-list'],
    queryFn: () => clientsApi.list({ limit: 100 }),
  });

  // Fetch resource overview
  const { data: resourcesRes, isLoading: loadingResources } = useQuery({
    queryKey: ['resources', 'dashboard-overview'],
    queryFn: () => resourcesApi.getOverview({ limit: 10 }),
  });

  const projects = projectsRes?.data || [];
  const clients = clientsRes?.data || [];
  const resourceSummary = resourcesRes?.summary;

  // Real Metric Derivations
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
  const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;
  const planningProjects = projects.filter((p) => p.status === 'PLANNING').length;
  const onHoldProjects = projects.filter((p) => p.status === 'ON_HOLD').length;

  const totalClients = clients.length;

  // Project Status Distribution Data for Recharts
  const statusChartData = [
    { name: 'Active', value: activeProjects, color: '#2563eb' },
    { name: 'Planning', value: planningProjects, color: '#64748b' },
    { name: 'Completed', value: completedProjects, color: '#10b981' },
    { name: 'On Hold', value: onHoldProjects, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  // Resource capacity data
  const availableMembers = resourceSummary?.availableMembers ?? 0;
  const fullyAllocatedMembers = resourceSummary?.fullyAllocatedMembers ?? 0;
  const overallocatedMembers = resourceSummary?.overallocatedMembers ?? 0;

  const resourceChartData = [
    { name: 'Available (<90%)', count: availableMembers, fill: '#10b981' },
    { name: 'Fully Allocated (90-100%)', count: fullyAllocatedMembers, fill: '#3b82f6' },
    { name: 'Overallocated (>100%)', count: overallocatedMembers, fill: '#ef4444' },
  ];

  const isLoading = loadingProjects || loadingClients;

  return (
    <DashboardLayout
      title="Executive Overview"
      description="Real-time delivery progress, health indicators, and capacity utilization."
    >
      <div className="space-y-8">
        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Projects
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <FolderKanban className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground">{totalProjects}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-blue-600 font-medium">{activeProjects} active</span>, {completedProjects} completed
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Managed Clients
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground">{totalClients}</div>
                  <p className="text-xs text-muted-foreground mt-1">Multi-tenant client organizations</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Avg. Team Capacity
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingResources ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {resourceSummary?.averageUtilizationPercentage ?? 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overallocatedMembers > 0 ? (
                      <span className="text-destructive font-medium">{overallocatedMembers} overallocated</span>
                    ) : (
                      <span className="text-emerald-600 font-medium">Healthy capacity balance</span>
                    )}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Available Resources
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <UserCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingResources ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {availableMembers}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ready for new project assignments
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Project Status Breakdown Chart */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Project Portfolio Status</CardTitle>
              <CardDescription className="text-xs">
                Distribution of all tracked delivery engagements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : statusChartData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
                  No projects available yet. Create your first project to view analytics.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={4}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resource Allocation Breakdown */}
          <Card className="border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Team Allocation Distribution</CardTitle>
              <CardDescription className="text-xs">
                Real capacity status based on &lt;90%, 90-100%, and &gt;100% policy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingResources ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resourceChartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {resourceChartData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects Table */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Active Projects</CardTitle>
              <CardDescription className="text-xs">Recent projects in your delivery pipeline</CardDescription>
            </div>
            <Link href="/projects">
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                View All
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No projects created yet.
                <div className="mt-4">
                  <Link href="/projects/new">
                    <Button size="sm">Create First Project</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/80 text-xs font-semibold text-muted-foreground">
                      <th className="pb-3 pr-4">Project</th>
                      <th className="pb-3 px-4">Client</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4">Timeline</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {projects.slice(0, 5).map((project) => (
                      <tr key={project.id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3.5 pr-4 font-medium text-foreground">
                          <Link href={`/projects/${project.id}`} className="hover:underline text-primary">
                            {project.name}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {project.client?.companyName || project.client?.name || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              project.status === 'ACTIVE'
                                ? 'default'
                                : project.status === 'COMPLETED'
                                ? 'healthy'
                                : 'muted'
                            }
                            className="text-[11px]"
                          >
                            {project.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {project.startDate ? formatDate(project.startDate) : 'Start TBD'} —{' '}
                          {project.endDate ? formatDate(project.endDate) : 'End TBD'}
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          <Link href={`/projects/${project.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 text-xs">
                              Manage
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
