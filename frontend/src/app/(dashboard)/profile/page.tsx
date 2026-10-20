'use client';

import React from 'react';
import Link from 'next/link';
import {
  UserCircle,
  Building2,
  Mail,
  Shield,
  Key,
  Calendar,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function UserProfilePage() {
  const { user, logout, isClient } = useAuth();

  if (!user) return null;

  const roleDescriptions: Record<string, string> = {
    SUPER_ADMIN: 'Complete multi-organization platform administrator with full system authority.',
    ADMIN: 'Organization administrator managing clients, projects, budgets, and team allocations.',
    PROJECT_MANAGER: 'Delivery manager overseeing project timelines, budgets, milestones, and reports.',
    TEAM_LEAD: 'Technical lead managing project execution, task assignments, and cost tracking.',
    TEAM_MEMBER: 'Project contributor delivering assigned tasks and updating completion status.',
    CLIENT: 'External client accessing milestone progress and AI delivery summaries via Client Portal.',
  };

  return (
    <DashboardLayout
      title="User Account & Security"
      description="Manage your profile, authenticated organization context, and session credentials."
    >
      <div className="max-w-4xl space-y-6">
        {/* Profile Card */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-2xl border border-primary/20 shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="px-3 py-1 text-xs font-semibold uppercase tracking-wider w-fit">
                {user.role.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="p-3.5 rounded-lg bg-muted/30 border border-border text-xs">
              <p className="font-semibold text-foreground mb-1">Role Authority</p>
              <p className="text-muted-foreground leading-relaxed">
                {roleDescriptions[user.role] || 'Authenticated ClientPulse user.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-card">
                <p className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  Organization Context
                </p>
                <p className="font-mono text-foreground font-semibold mt-1 break-all">
                  {user.organizationId}
                </p>
              </div>

              {user.clientId && (
                <div className="p-3 rounded-lg border border-border bg-card">
                  <p className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    Associated Client Profile
                  </p>
                  <p className="font-mono text-foreground font-semibold mt-1 break-all">
                    {user.clientId}
                  </p>
                </div>
              )}

              <div className="p-3 rounded-lg border border-border bg-card">
                <p className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-600" />
                  Session Status
                </p>
                <p className="text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Active JWT Token Session
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-card">
                <p className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  User Identifier
                </p>
                <p className="font-mono text-foreground font-semibold mt-1 break-all">
                  {user.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Sign Out */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Session Management</CardTitle>
            <CardDescription className="text-xs">
              Terminate your current authenticated session and revoke refresh tokens
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-2">
            <div>
              <p className="text-xs font-medium text-foreground">Sign out of this browser</p>
              <p className="text-[11px] text-muted-foreground">
                Clears access token from memory and invalidates refresh token on the server.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={logout}
              className="gap-2 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
