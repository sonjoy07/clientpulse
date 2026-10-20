'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { resourcesApi } from '@/lib/api/services';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Users,
  UserCheck,
  AlertTriangle,
  Activity,
  Search,
  ArrowRight,
  TrendingUp,
  Briefcase,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export default function ResourcesPage() {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');

  const { data: overviewData, isLoading: loadingOverview } = useQuery({
    queryKey: ['resources-overview', search, selectedRole],
    queryFn: () =>
      resourcesApi.getOverview({
        search: search || undefined,
        role: selectedRole || undefined,
        limit: 50,
      }),
  });

  const { data: rankingData } = useQuery({
    queryKey: ['resources-ranking'],
    queryFn: () => resourcesApi.getRanking(),
  });

  const profiles = overviewData?.data || [];
  const summary = overviewData?.summary;

  const totalMembers = summary?.totalResources ?? summary?.totalTeamMembers ?? profiles.length;
  const availableMembers = summary?.available ?? summary?.availableMembers ?? summary?.availableCount ?? 0;
  const fullMembers = summary?.full ?? summary?.fullyAllocatedMembers ?? summary?.fullCount ?? 0;
  const overallocatedMembers = summary?.overallocated ?? summary?.overallocatedMembers ?? summary?.overallocatedCount ?? 0;
  const avgUtilization = summary?.averageAllocation ?? summary?.averageUtilizationPercentage ?? 0;

  // Chart data for project ranking
  const rawRanking = (rankingData as any)?.data || [];
  const projectChartData = Array.isArray(rawRanking)
    ? rawRanking.slice(0, 6).map((item: any) => ({
        name: item.projectName || item.name || 'Project',
        members: item.totalMembers || item.memberCount || 1,
        allocation: item.totalAllocation || item.averageAllocation || 0,
      }))
    : [];

  return (
    <DashboardLayout
      title="Resource Capacity Planning"
      description="Monitor team allocation, detect burnout risks, and balance workload across active projects."
      requiredRoles={['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD']}
    >
      <div className="space-y-6">

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Team</p>
              <p className="text-2xl font-bold mt-1">{totalMembers}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Available</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{availableMembers}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Capacity</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{fullMembers}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overallocated</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{overallocatedMembers}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Utilization</p>
              <p className="text-2xl font-bold text-foreground mt-1">{Math.round(avgUtilization)}%</p>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking / Distribution Chart */}
      {projectChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Project Resource Allocation Ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectChartData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <XAxis type="number" unit="%" domain={[0, 'dataMax + 20']} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip
                    formatter={(val: any) => [`${val}% Total Allocation`, 'Allocation']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="allocation" radius={[0, 4, 4, 0]}>
                    {projectChartData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.allocation > 150 ? '#f43f5e' : entry.allocation > 90 ? '#3b82f6' : '#10b981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search team member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Filter Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Roles</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="TEAM_LEAD">Team Lead</option>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Team Allocation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Team Workload Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingOverview ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-semibold text-foreground">No resources found</h3>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search criteria or role filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider border-b">
                  <tr>
                    <th className="px-6 py-3">Member</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Workload (%)</th>
                    <th className="px-6 py-3">Available Capacity</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Assigned Projects</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profiles.map((profile) => {
                    const uId = profile.userId || profile.user?.id || '';
                    const uName = profile.name || profile.user?.name || 'Unknown';
                    const uEmail = profile.email || profile.user?.email || '';
                    const uRole = profile.role || profile.user?.role || 'TEAM_MEMBER';
                    const totalAlloc = profile.totalAllocation ?? profile.totalAllocationPercentage ?? 0;
                    const availableCap = profile.availableCapacity ?? profile.availableCapacityPercentage ?? Math.max(0, 100 - totalAlloc);
                    const status = profile.status || profile.allocationStatus || (totalAlloc > 100 ? 'OVERALLOCATED' : totalAlloc >= 90 ? 'FULL' : 'AVAILABLE');
                    const projectList = profile.projects || profile.allocations || [];

                    return (
                      <tr key={uId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center">
                              {uName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{uName}</p>
                              <p className="text-xs text-muted-foreground">{uEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-xs font-mono">
                            {String(uRole).replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 min-w-[180px]">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium">{totalAlloc}%</span>
                              {totalAlloc > 100 && (
                                <span className="text-rose-600 font-semibold">+{totalAlloc - 100}% over</span>
                              )}
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  totalAlloc > 100
                                    ? 'bg-rose-500'
                                    : totalAlloc >= 90
                                    ? 'bg-blue-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(totalAlloc, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium">
                          {availableCap}%
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              status === 'OVERALLOCATED'
                                ? 'destructive'
                                : status === 'FULL'
                                ? 'default'
                                : 'outline'
                            }
                            className={
                              status === 'AVAILABLE'
                                ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                                : ''
                            }
                          >
                            {status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {projectList.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">None</span>
                            ) : (
                              projectList.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] bg-muted px-2 py-0.5 rounded text-foreground font-medium"
                                >
                                  {p.projectName} ({p.allocationPercentage}%)
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/resources/${uId}`}>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                              Profile
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
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
