'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Mail, Phone, Calendar, Edit2, FolderKanban, Plus } from 'lucide-react';
import { clientsApi, projectsApi } from '@/lib/api/services';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils/cn';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const { data: clientRes, isLoading: loadingClient } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.get(clientId),
  });

  const { data: projectsRes, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects', { clientId }],
    queryFn: () => projectsApi.list({ clientId, limit: 50 }),
  });

  const client = clientRes?.data;
  const projects = projectsRes?.data || [];

  return (
    <DashboardLayout
      title={client?.companyName || client?.name || 'Client Details'}
      description="Client organization details and active project portfolio."
      requiredRoles={['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER']}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/clients" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Client Directory
          </Link>
          {client && (
            <Link href={`/clients/${client.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Edit2 className="h-3.5 w-3.5" />
                Edit Client Profile
              </Button>
            </Link>
          )}
        </div>

        {/* Client Profile Header Card */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl font-bold">
                  {loadingClient ? <Skeleton className="h-6 w-48" /> : client?.companyName || client?.name}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Primary Contact: {client?.name}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {projects.length} Engagement{projects.length === 1 ? '' : 's'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingClient ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : client ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2 border-t border-border/50 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground font-medium">Email</span>
                    <span className="font-medium text-foreground">{client.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground font-medium">Phone</span>
                    <span className="font-medium text-foreground">{client.phone || 'Not provided'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground font-medium">Onboarded</span>
                    <span className="font-medium text-foreground">{formatDate(client.createdAt)}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Associated Projects Section */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Associated Projects</CardTitle>
              <CardDescription className="text-xs">
                Deliverables and services contracted by this client
              </CardDescription>
            </div>
            <Link href={`/projects/new?clientId=${clientId}`}>
              <Button size="sm" className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                New Project
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No active projects assigned to this client yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/80 text-xs font-semibold text-muted-foreground">
                      <th className="pb-3 pr-4">Project Name</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4">Timeline</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {projects.map((proj) => (
                      <tr key={proj.id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3 pr-4 font-medium text-foreground">
                          <Link href={`/projects/${proj.id}`} className="hover:underline text-primary">
                            {proj.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              proj.status === 'ACTIVE'
                                ? 'default'
                                : proj.status === 'COMPLETED'
                                ? 'healthy'
                                : 'muted'
                            }
                            className="text-[11px]"
                          >
                            {proj.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {proj.startDate ? formatDate(proj.startDate) : 'TBD'} —{' '}
                          {proj.endDate ? formatDate(proj.endDate) : 'TBD'}
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <Link href={`/projects/${proj.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 text-xs">
                              View Project
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
