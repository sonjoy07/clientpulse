'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { resourcesApi } from '@/lib/api/services';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  ArrowLeft,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function ResourceProfilePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const userId = resolvedParams.userId;

  const { data, isLoading, error } = useQuery({
    queryKey: ['resource-user-profile', userId],
    queryFn: () => resourcesApi.getUserProfile(userId),
    enabled: !!userId,
  });

  const profile = data?.data;

  if (isLoading) {
    return (
      <DashboardLayout title="Member Allocation" description="Team capacity and project allocations.">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !profile) {
    return (
      <DashboardLayout title="Member Allocation" description="Team capacity and project allocations.">
        <div className="p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-semibold">User Resource Profile Not Found</h2>
          <p className="text-sm text-muted-foreground">
            The requested member could not be found or you do not have permission to view their resource allocation.
          </p>
          <Link href="/resources">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Resources
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const uName = profile.name || profile.user?.name || 'Team Member';
  const uEmail = profile.email || profile.user?.email || '';
  const uRole = profile.role || profile.user?.role || 'TEAM_MEMBER';
  const totalAlloc = profile.totalAllocation ?? profile.totalAllocationPercentage ?? 0;
  const availableCap = profile.availableCapacity ?? profile.availableCapacityPercentage ?? Math.max(0, 100 - totalAlloc);
  const status = profile.status || profile.allocationStatus || (totalAlloc > 100 ? 'OVERALLOCATED' : 'AVAILABLE');
  const allocations = profile.projects || profile.allocations || [];

  // Chart data
  const pieData = [
    ...allocations.map((a) => ({
      name: a.projectName,
      value: a.allocationPercentage,
    })),
    ...(availableCap > 0
      ? [
          {
            name: 'Available Capacity',
            value: availableCap,
          },
        ]
      : []),
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#94a3b8'];

  return (
    <DashboardLayout
      title={`${uName} — Allocation Profile`}
      description="Detailed project workload breakdown and capacity availability."
      requiredRoles={['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD']}
    >
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/resources">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center">
              {uName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{uName}</h1>
                <Badge variant="outline" className="text-xs">
                  {String(uRole).replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{uEmail}</p>
            </div>
          </div>
        </div>

        <div>
          <Badge
            variant={
              status === 'OVERALLOCATED'
                ? 'destructive'
                : status === 'FULL'
                ? 'default'
                : 'outline'
            }
            className={`text-sm px-3 py-1 ${
              status === 'AVAILABLE' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : ''
            }`}
          >
            {status} ({totalAlloc}% Utilized)
          </Badge>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Current Workload</p>
            <p className="text-2xl font-bold mt-1">{totalAlloc}%</p>
            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-2 rounded-full ${
                  totalAlloc > 100 ? 'bg-rose-500' : totalAlloc >= 90 ? 'bg-blue-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(totalAlloc, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Available Bandwidth</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{availableCap}%</p>
            <p className="text-xs text-muted-foreground mt-1">Ready for new assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase">Active Project Count</p>
            <p className="text-2xl font-bold text-foreground mt-1">{allocations.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Simultaneous commitments</p>
          </CardContent>
        </Card>
      </div>

      {/* Workload Breakdown Chart & Allocation List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Allocation Share</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No active allocations</p>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`${value}%`, 'Bandwidth']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              Assigned Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {allocations.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No projects assigned</p>
                <p className="text-xs text-muted-foreground mt-1">This member has 100% capacity available.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {allocations.map((alloc, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {alloc.projectName}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Commitment: {alloc.allocationPercentage}% of weekly capacity
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min(alloc.allocationPercentage, 100)}%` }}
                        />
                      </div>
                      <Link href={`/projects/${alloc.projectId}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  </DashboardLayout>
);
}
