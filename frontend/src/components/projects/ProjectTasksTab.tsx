'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, CheckCircle2, Clock, AlertCircle, User, Calendar } from 'lucide-react';
import { tasksApi, milestonesApi, projectMembersApi } from '@/lib/api/services';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils/cn';
import { toast } from 'sonner';

interface ProjectTasksTabProps {
  projectId: string;
  canManage?: boolean;
}

export function ProjectTasksTab({ projectId, canManage = true }: ProjectTasksTabProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');

  // Queries
  const { data: tasksRes, isLoading } = useQuery({
    queryKey: ['tasks', projectId, { status: statusFilter }],
    queryFn: () => tasksApi.list(projectId, { status: statusFilter || undefined, limit: 100 }),
  });

  const { data: milestonesRes } = useQuery({
    queryKey: ['milestones', projectId],
    queryFn: () => milestonesApi.list(projectId, { limit: 50 }),
  });

  const { data: membersRes } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectMembersApi.list(projectId, { limit: 50 }),
  });

  const tasks = tasksRes?.data || [];
  const milestones = milestonesRes?.data || [];
  const members = membersRes?.data || [];

  const filteredTasks = tasks.filter((t) =>
    search.trim() ? t.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data: any) => tasksApi.create(projectId, data),
    onSuccess: () => {
      toast.success('Task created successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-delivery', projectId] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error('Failed to create task', { description: err?.message });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, newStatus }: { taskId: string; newStatus: TaskStatus }) =>
      tasksApi.update(projectId, taskId, { status: newStatus }),
    onSuccess: () => {
      toast.success('Task status updated');
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-delivery', projectId] });
    },
    onError: (err: any) => {
      toast.error('Failed to update status', { description: err?.message });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.remove(projectId, taskId),
    onSuccess: () => {
      toast.success('Task deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-delivery', projectId] });
      setDeleteTaskId(null);
    },
    onError: (err: any) => {
      toast.error('Failed to delete task', { description: err?.message });
      setDeleteTaskId(null);
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStatus('TODO');
    setPriority('MEDIUM');
    setDueDate('');
    setAssigneeId('');
    setMilestoneId('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }
    createTaskMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate || undefined,
      assigneeId: assigneeId || undefined,
      milestoneId: milestoneId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>
        </div>

        {canManage && (
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 text-xs">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>

      {/* Task List Table */}
      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Project Tasks ({filteredTasks.length})</CardTitle>
          <CardDescription className="text-xs">
            Operational deliverables feeding real-time completion progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No tasks found. Create a task to begin tracking delivery progress.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/80 text-xs font-semibold text-muted-foreground">
                    <th className="pb-3 pr-4">Title</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4">Priority</th>
                    <th className="pb-3 px-4">Milestone</th>
                    <th className="pb-3 px-4">Assignee</th>
                    <th className="pb-3 px-4">Due Date</th>
                    {canManage && <th className="pb-3 pl-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3.5 pr-4">
                        <span className="font-medium text-foreground block">{task.title}</span>
                        {task.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                            {task.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={task.status}
                          disabled={!canManage}
                          onChange={(e) =>
                            updateStatusMutation.mutate({
                              taskId: task.id,
                              newStatus: e.target.value as TaskStatus,
                            })
                          }
                          className="h-7 rounded border border-input bg-card px-2 text-xs font-medium focus-visible:outline-none"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="BLOCKED">Blocked</option>
                          <option value="DONE">Done</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            task.priority === 'URGENT'
                              ? 'critical'
                              : task.priority === 'HIGH'
                              ? 'atRisk'
                              : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {task.milestone?.name || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {task.assignee?.name || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(task.dueDate)}
                      </td>
                      {canManage && (
                        <td className="py-3.5 pl-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTaskId(task.id)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete task</span>
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>
            Add a new deliverable task to this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" htmlFor="task-title">
              Title *
            </label>
            <Input
              id="task-title"
              placeholder="e.g. Implement OAuth2 client credentials grant"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold" htmlFor="task-desc">
              Description
            </label>
            <textarea
              id="task-desc"
              rows={2}
              placeholder="Task details and acceptance criteria..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Assignee (Team Member)</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name} ({m.allocationPercentage}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Milestone</label>
              <select
                value={milestoneId}
                onChange={(e) => setMilestoneId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
              >
                <option value="">None</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <DialogHeader>
          <DialogTitle>Delete Task</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this task? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setDeleteTaskId(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteTaskId && deleteTaskMutation.mutate(deleteTaskId)}
            disabled={deleteTaskMutation.isPending}
          >
            {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
