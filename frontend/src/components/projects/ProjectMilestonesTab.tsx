'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Milestone as MilestoneIcon, Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { milestonesApi } from '@/lib/api/services';
import { Milestone, MilestoneStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils/cn';
import { toast } from 'sonner';

interface ProjectMilestonesTabProps {
  projectId: string;
  canManage?: boolean;
}

export function ProjectMilestonesTab({ projectId, canManage = true }: ProjectMilestonesTabProps) {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // New milestone form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<MilestoneStatus>('PENDING');

  const { data: milestonesRes, isLoading } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestonesApi.list(projectId, { limit: 100 }),
  });

  const milestones = milestonesRes?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => milestonesApi.create(projectId, data),
    onSuccess: () => {
      toast.success('Milestone created successfully');
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-delivery', projectId] });
      setCreateDialogOpen(false);
      setName('');
      setDescription('');
      setDueDate('');
      setStatus('PENDING');
    },
    onError: (err: any) => {
      toast.error('Failed to create milestone', { description: err?.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (milestoneId: string) => milestonesApi.remove(projectId, milestoneId),
    onSuccess: () => {
      toast.success('Milestone deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['milestones', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-delivery', projectId] });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast.error('Failed to delete milestone', {
        description: err?.message || 'Milestones with active tasks cannot be deleted.',
      });
      setDeleteId(null);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Milestone name is required');
      return;
    }
    if (!dueDate) {
      toast.error('Due date is required');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      dueDate,
    });
  };

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Delivery Milestones</h3>
          <p className="text-xs text-muted-foreground">Target phases and client sign-off deliverables</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-2 text-xs">
            <Plus className="h-4 w-4" />
            Add Milestone
          </Button>
        )}
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <MilestoneIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No milestones established yet for this project.
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => {
                const isOverdue =
                  m.dueDate && new Date(m.dueDate) < now && m.status !== 'COMPLETED';

                return (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{m.name}</span>
                        <Badge
                          variant={
                            m.status === 'COMPLETED'
                              ? 'healthy'
                              : m.status === 'IN_PROGRESS'
                              ? 'default'
                              : m.status === 'BLOCKED'
                              ? 'critical'
                              : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {m.status}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="critical" className="text-[10px]">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      {m.description && (
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Due {formatDate(m.dueDate)}</span>
                      </div>
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {m._count?.tasks ?? 0} task{m._count?.tasks === 1 ? '' : 's'}
                      </span>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(m.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete milestone</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Milestone Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogHeader>
          <DialogTitle>Add Milestone</DialogTitle>
          <DialogDescription>Define a major project release or sign-off milestone.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" htmlFor="m-name">
              Milestone Name *
            </label>
            <Input
              id="m-name"
              placeholder="e.g. Beta MVP Release"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" htmlFor="m-desc">
              Description
            </label>
            <textarea
              id="m-desc"
              rows={2}
              placeholder="Key deliverable criteria for this milestone..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Due Date *</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Create Milestone'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Milestone Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogHeader>
          <DialogTitle>Delete Milestone</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this milestone? Milestones with associated tasks cannot be deleted until tasks are reassigned or removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
