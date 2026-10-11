'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  FolderKanban,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import { projectsApi, clientsApi } from '@/lib/api/services';
import { useAuth } from '@/lib/auth/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils/cn';
import { toast } from 'sonner';

export default function ProjectsListPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canCreate = hasRole(['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER']);
  const canDelete = hasRole(['SUPER_ADMIN', 'ADMIN']);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, status: statusFilter }],
    queryFn: () =>
      projectsApi.list({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        limit: 50,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: () => {
      toast.success('Project deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast.error('Failed to delete project', {
        description:
          err?.message ||
          'Projects with active milestones or tasks cannot be deleted directly.',
      });
      setDeleteId(null);
    },
  });

  const projects = data?.data || [];

  return (
    <DashboardLayout
      title="Projects Portfolio"
      description="Track delivery status, timelines, tasks, and budgets across active projects."
    >
      <div className="space-y-6">
        {/* Actions & Filters Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-card px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">All Statuses</option>
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {canCreate && (
            <Link href="/projects/new">
              <Button className="w-full sm:w-auto gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </Link>
          )}
        </div>

        {/* Projects Table Card */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Tracked Projects ({projects.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Delivery progress, milestone deliverables, and resource assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No projects found matching the current criteria.</p>
                {canCreate && (
                  <div className="mt-4">
                    <Link href="/projects/new">
                      <Button size="sm">Create First Project</Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/80 text-xs font-semibold text-muted-foreground">
                      <th className="pb-3 pr-4">Project Name</th>
                      <th className="pb-3 px-4">Client</th>
                      <th className="pb-3 px-4">Status</th>
                      <th className="pb-3 px-4">Team</th>
                      <th className="pb-3 px-4">Milestones</th>
                      <th className="pb-3 px-4">Timeline</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {projects.map((project) => (
                      <tr key={project.id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3.5 pr-4 font-medium text-foreground">
                          <Link
                            href={`/projects/${project.id}`}
                            className="hover:underline text-primary font-semibold"
                          >
                            {project.name}
                          </Link>
                          {project.description && (
                            <span className="block text-xs text-muted-foreground line-clamp-1 max-w-xs">
                              {project.description}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground text-xs">
                          {project.client?.companyName || project.client?.name || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              project.status === 'ACTIVE'
                                ? 'default'
                                : project.status === 'COMPLETED'
                                ? 'healthy'
                                : project.status === 'ON_HOLD'
                                ? 'atRisk'
                                : 'muted'
                            }
                            className="text-[11px]"
                          >
                            {project.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {project._count?.projectMembers ?? 0} members
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {project._count?.milestones ?? 0} ({project._count?.tasks ?? 0} tasks)
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {project.startDate ? formatDate(project.startDate) : 'TBD'} —{' '}
                          {project.endDate ? formatDate(project.endDate) : 'TBD'}
                        </td>
                        <td className="py-3.5 pl-4 text-right space-x-1 whitespace-nowrap">
                          <Link href={`/projects/${project.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 text-xs">
                              Dashboard
                            </Button>
                          </Link>
                          {canCreate && (
                            <Link href={`/projects/${project.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit project</span>
                              </Button>
                            </Link>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(project.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete project</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? The backend will prevent deleting projects with active milestones or tasks to protect historical delivery data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm Deletion'}
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
