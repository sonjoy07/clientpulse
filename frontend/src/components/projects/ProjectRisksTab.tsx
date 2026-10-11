'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, AlertTriangle, AlertCircle, Info, CheckCircle2, Clock } from 'lucide-react';
import { projectsApi } from '@/lib/api/services';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils/cn';

interface ProjectRisksTabProps {
  projectId: string;
}

export function ProjectRisksTab({ projectId }: ProjectRisksTabProps) {
  const { data: healthRes, isLoading } = useQuery({
    queryKey: ['project-health', projectId],
    queryFn: () => projectsApi.getHealth(projectId),
  });

  const health = healthRes?.data;
  const risks = health?.risks || [];

  return (
    <div className="space-y-6">
      {/* Health Score Overview Card */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">Project Delivery Health Diagnostics</CardTitle>
              <CardDescription className="text-xs">
                Computed by ClientPulse Risk & Health Engine from real delivery, budget, and capacity metrics
              </CardDescription>
            </div>
            {health && (
              <Badge
                variant={
                  health.status === 'HEALTHY'
                    ? 'healthy'
                    : health.status === 'AT_RISK'
                    ? 'atRisk'
                    : 'critical'
                }
                className="text-xs py-1 px-3 font-semibold uppercase tracking-wider shrink-0"
              >
                {health.status.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : health ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 rounded-xl bg-slate-50 border border-border">
                <div className="text-center sm:text-left">
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-foreground">
                      {health.score}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">/ 100</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Composite Health Score</span>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Diagnostic Health Range</span>
                    <span className="font-semibold text-foreground">
                      {health.score >= 80 ? 'Optimal Performance' : health.score >= 60 ? 'Moderate Risk Detected' : 'Urgent Escalation Required'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ${
                        health.score >= 80
                          ? 'bg-emerald-500'
                          : health.score >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${health.score}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Reasons / Health deduction breakdown */}
              {health.reasons.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Score Deductions & Trigger Explanations
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {health.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Identified Risks Detailed List */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active Risk Signals ({risks.length})</CardTitle>
          <CardDescription className="text-xs">
            Multi-factor risks classified by severity: CRITICAL, HIGH, MEDIUM, LOW
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : risks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
              <span className="text-sm font-semibold text-emerald-800">Zero Critical or High Risks</span>
              <span className="mt-1">
                Project delivery is tracking according to baseline schedule and budget parameters.
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {risks.map((risk, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border bg-card space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{risk.title}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                        {risk.type}
                      </Badge>
                    </div>
                    <Badge
                      variant={
                        risk.severity === 'CRITICAL'
                          ? 'critical'
                          : risk.severity === 'HIGH'
                          ? 'atRisk'
                          : 'secondary'
                      }
                      className="text-[10px] font-semibold"
                    >
                      {risk.severity}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{risk.description}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 pt-1">
                    <Clock className="h-3 w-3" />
                    <span>Detected {formatDate(risk.detectedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
