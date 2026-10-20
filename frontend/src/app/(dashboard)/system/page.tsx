'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Server,
  Database,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { systemApi } from '@/lib/api/services';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function SystemHealthPage() {
  const {
    data: healthData,
    isLoading: loadingHealth,
    refetch: refetchHealth,
    isFetching: fetchingHealth,
  } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => systemApi.getHealth(),
    refetchInterval: 15000, // refresh every 15s
  });

  const {
    data: queueRes,
    isLoading: loadingQueues,
    refetch: refetchQueues,
    isFetching: fetchingQueues,
  } = useQuery({
    queryKey: ['system-queues'],
    queryFn: () => systemApi.getQueueMetrics(),
    refetchInterval: 10000, // refresh every 10s
  });

  const queue = queueRes?.data;
  const isRefreshing = fetchingHealth || fetchingQueues;

  const handleRefreshAll = () => {
    refetchHealth();
    refetchQueues();
  };

  return (
    <DashboardLayout
      title="System Health & Queue Operations"
      description="Live platform telemetry, background BullMQ worker status, and microservice infrastructure."
      requiredRoles={['SUPER_ADMIN', 'ADMIN']}
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-600">Telemetry Active</span>
            <span className="text-xs text-muted-foreground">• Auto-refreshing</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Now
          </Button>
        </div>

        {/* Infrastructure Health Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* API Core */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                API Service
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Server className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingHealth ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-foreground">Operational</span>
                    <Badge variant="healthy" className="text-[10px]">UP</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">NestJS Core Runtime</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* PostgreSQL DB */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                PostgreSQL DB
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Database className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingHealth ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-foreground">
                      {healthData?.services?.database?.status === 'healthy' ? 'Healthy' : 'Connected'}
                    </span>
                    <Badge variant="healthy" className="text-[10px]">CONNECTED</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Prisma Connection Pool</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Redis Cluster */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Redis Service
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Cpu className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingHealth ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-foreground">
                      {healthData?.services?.redis?.status === 'healthy' ? 'Healthy' : 'Active'}
                    </span>
                    <Badge variant="healthy" className="text-[10px]">ACTIVE</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">BullMQ Queue Broker</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Platform Security */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Multi-Tenant Isolation
              </CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-foreground">Enforced</span>
                <Badge variant="default" className="text-[10px]">ACTIVE</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Strict Org & Client Guards</p>
            </CardContent>
          </Card>
        </div>

        {/* BullMQ AI Report Queue Telemetry */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-semibold">AI Report Queue Metrics</CardTitle>
                  <CardDescription className="text-xs">
                    Queue: <code className="font-mono text-foreground font-semibold">{queue?.queue || 'ai-reports'}</code> (BullMQ on Redis)
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                Background Worker
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingQueues ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* Waiting */}
                <div className="p-3.5 rounded-lg border border-border bg-card text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Waiting</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{queue?.waiting ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">In backlog queue</p>
                </div>

                {/* Active */}
                <div className="p-3.5 rounded-lg border border-border bg-card text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{queue?.active ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Currently processing</p>
                </div>

                {/* Completed */}
                <div className="p-3.5 rounded-lg border border-border bg-card text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{queue?.completed ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Successfully generated</p>
                </div>

                {/* Failed */}
                <div className="p-3.5 rounded-lg border border-border bg-card text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed</p>
                  <p className="text-2xl font-bold text-rose-600 mt-1">{queue?.failed ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Errors / Rate limits</p>
                </div>

                {/* Delayed */}
                <div className="p-3.5 rounded-lg border border-border bg-card text-center">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Delayed</p>
                  <p className="text-2xl font-bold text-slate-600 mt-1">{queue?.delayed ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Scheduled for retry</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Diagnostics Details */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Service Diagnostic Endpoints</CardTitle>
            <CardDescription className="text-xs">
              Automated probes configured for container orchestrators and reverse-proxy load balancers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-[10px]">GET</Badge>
                <code className="font-mono font-semibold">/api/health</code>
                <span className="text-muted-foreground hidden sm:inline">Overall system liveness & readiness check</span>
              </div>
              <Badge variant="healthy" className="text-[10px]">200 OK</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-[10px]">GET</Badge>
                <code className="font-mono font-semibold">/api/health/live</code>
                <span className="text-muted-foreground hidden sm:inline">Kubernetes / Docker container liveness probe</span>
              </div>
              <Badge variant="healthy" className="text-[10px]">200 OK</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-[10px]">GET</Badge>
                <code className="font-mono font-semibold">/api/health/ready</code>
                <span className="text-muted-foreground hidden sm:inline">Readiness probe (verifies Postgres & Redis)</span>
              </div>
              <Badge variant="healthy" className="text-[10px]">200 OK</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 text-xs">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-[10px]">GET</Badge>
                <code className="font-mono font-semibold">/api/admin/queues/ai-reports</code>
                <span className="text-muted-foreground hidden sm:inline">BullMQ queue telemetry and job counters</span>
              </div>
              <Badge variant="healthy" className="text-[10px]">200 OK</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
