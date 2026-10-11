'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  FolderKanban,
  DollarSign,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Project, DeliverySummary, ProjectHealthResult, BudgetSummary } from '@/types';
import { projectsApi, budgetsApi } from '@/lib/api/services';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatCurrency } from '@/lib/utils/cn';

interface ProjectOverviewTabProps {
  project: Project;
  canViewBudget?: boolean;
}

export function ProjectOverviewTab({ project, canViewBudget }: ProjectOverviewTabProps) {
  const { data: deliveryRes, isLoading: loadingDelivery } = useQuery({
    queryKey: ['project-delivery', project.id],
    queryFn: () => projectsApi.getDeliverySummary(project.id),
  });

  const { data: healthRes, isLoading: loadingHealth } = useQuery({
    queryKey: ['project-health', project.id],
    queryFn: () => projectsApi.getHealth(project.id),
  });

  const { data: budgetRes, isLoading: loadingBudget } = useQuery({
    queryKey: ['project-budget-summary', project.id],
    queryFn: () => budgetsApi.getSummary(project.id),
    enabled: canViewBudget,
  });

  const delivery = deliveryRes?.data;
  const health = healthRes?.data;
  const budget = budgetRes?.data;

  const progress = delivery?.progress ?? 0;
  const timelineStatus = delivery?.timeline?.status ?? 'NOT_STARTED';

  return (
    <div className="space-y-6">
      {/* Overview Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Delivery Progress Card */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Delivery Progress
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingDelivery ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold tracking-tight text-foreground">{progress}%</div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {delivery?.tasks.done ?? 0} of {delivery?.tasks.total ?? 0} tasks completed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Timeline Status Card */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Timeline Status
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loadingDelivery ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="mt-1">
                  <Badge
                    variant={
                      timelineStatus === 'ON_TRACK' || timelineStatus === 'COMPLETED'
                        ? 'healthy'
                        : timelineStatus === 'AT_RISK'
                        ? 'atRisk'
                        : 'critical'
                    }
                    className="text-xs py-1 px-2.5 font-semibold"
                  >
                    {timelineStatus.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Expected Progress: {delivery?.timeline.expectedProgress ?? 0}%
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Health Score Card */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Project Health Score
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {health?.score ?? 100}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <div className="mt-1">
                  <Badge
                    variant={
                      health?.status === 'HEALTHY'
                        ? 'healthy'
                        : health?.status === 'AT_RISK'
                        ? 'atRisk'
                        : 'critical'
                    }
                    className="text-[11px]"
                  >
                    {health?.status ?? 'HEALTHY'}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Budget Health Card (if authorized) */}
        {canViewBudget && (
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Budget Burn Rate
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              {loadingBudget ? (
                <Skeleton className="h-8 w-24" />
              ) : budget ? (
                <>
                  <div className="text-xl font-bold tracking-tight text-foreground">
                    {formatCurrency(budget.totalSpent, budget.currency)}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        budget.utilizationPercentage > 100
                          ? 'bg-rose-500'
                          : budget.utilizationPercentage >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, budget.utilizationPercentage))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {budget.utilizationPercentage}% of {formatCurrency(budget.totalBudget, budget.currency)}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">No budget configured</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Project Scope Description & Milestones / Deliverables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Scope & Deliverables</CardTitle>
            <CardDescription className="text-xs">Client requirements and engagement objectives</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {project.description || 'No detailed scope description provided for this project.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/60 text-xs">
              <div>
                <span className="block text-muted-foreground font-medium">Start Date</span>
                <span className="font-semibold">{formatDate(project.startDate)}</span>
              </div>
              <div>
                <span className="block text-muted-foreground font-medium">Target End Date</span>
                <span className="font-semibold">{formatDate(project.endDate)}</span>
              </div>
              <div>
                <span className="block text-muted-foreground font-medium">Assigned Team</span>
                <span className="font-semibold">{project._count?.projectMembers ?? 0} members</span>
              </div>
              <div>
                <span className="block text-muted-foreground font-medium">Milestones</span>
                <span className="font-semibold">{project._count?.milestones ?? 0} milestones</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identified Health Risks Preview */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Delivery Risk Signals</CardTitle>
            <CardDescription className="text-xs">Real-time risk engine diagnostics</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !health || health.risks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <span className="font-medium text-emerald-700">All Delivery Indicators Healthy</span>
                <span className="mt-1">No timeline, budget, or blocked task risks detected.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {health.risks.slice(0, 3).map((risk, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border bg-slate-50/50 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{risk.title}</span>
                      <Badge
                        variant={risk.severity === 'CRITICAL' ? 'critical' : 'atRisk'}
                        className="text-[10px]"
                      >
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{risk.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
