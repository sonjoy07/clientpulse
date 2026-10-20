'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Search,
  Filter,
  Clock,
  AlertCircle,
  Calendar,
  FolderKanban,
  User,
  ArrowRight,
  CheckCircle2,
  ListFilter,
  Check,
} from 'lucide-react';
import { tasksApi, projectsApi } from '@/lib/api/services';
import { useAuth } from '@/lib/auth/AuthContext';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils/cn';
import { toast } from 'sonner';

export default function TasksDirectoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isTeamMember = user?.role === 'TEAM_MEMBER';

  // State
  const [activeTab, setActiveTab] = useState<'all' | 'my'>(isTeamMember ? 'my' : 'all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Status update modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editStatus, setEditStatus] = useState<TaskStatus>('TODO');
  const [editDescription, setEditDescription] = useState('');

  // Fetch projects for filter
  const { data: projectsRes } = useQuery({
    queryKey: ['projects', 'filter-list'],
    queryFn: () => projectsApi.list({ limit: 100 }),
  });
  const projects = projectsRes?.data || [];

  // Fetch All Organization Tasks
  const { data: allTasksRes, isLoading: loadingAll } = useQuery({
    queryKey: ['tasks', 'all', { status: statusFilter, priority: priorityFilter, projectId: projectFilter, search }],
    queryFn: () =>
      tasksApi.listAll({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        projectId: projectFilter || undefined,
        search: search || undefined,
        limit: 100,
      }),
    enabled: activeTab === 'all',
  });

  // Fetch My Assigned Tasks
  const { data: myTasksRes, isLoading: loadingMy } = useQuery({
    queryKey: ['tasks', 'my', { status: statusFilter, priority: priorityFilter, projectId: projectFilter, search }],
    queryFn: () =>
      tasksApi.listMy({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        projectId: projectFilter || undefined,
        search: search || undefined,
        limit: 100,
      }),
    enabled: activeTab === 'my',
  });

  const isLoading = activeTab === 'all' ? loadingAll : loadingMy;
  const tasks = activeTab === 'all' ? allTasksRes?.data || [] : myTasksRes?.data || [];

  // Update Task Mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: { status: TaskStatus; description?: string } }) =>
      tasksApi.updateDirect(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully');
      setEditingTask(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update task');
    },
  });

  const handleOpenEdit = (task: Task) => {
    // Check permission: Team members can only edit their assigned tasks
    if (isTeamMember && task.assigneeId !== user?.id) {
      toast.error('You can only update tasks assigned to you');
      return;
    }
    setEditingTask(task);
    setEditStatus(task.status);
    setEditDescription(task.description || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    updateTaskMutation.mutate({
      taskId: editingTask.id,
      data: {
        status: editStatus,
        description: editDescription,
      },
    });
  };

  const now = new Date();

  return (
    <DashboardLayout
      title={isTeamMember ? 'My Assigned Tasks' : 'Task Management'}
      description="Track, update, and manage project delivery tasks across the organization."
    >
      <div className="space-y-6">
        {/* Tab & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tab Switcher */}
          {!isTeamMember && (
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-1 w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'all'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Organization Tasks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('my')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'my'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                My Tasks
              </button>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Total {activeTab === 'my' ? 'Assigned' : ''} Tasks:{' '}
              <span className="font-semibold text-foreground">{tasks.length}</span>
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <Card className="border border-border/80 shadow-xs">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter tasks by status"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">All Statuses</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="DONE">Done</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  aria-label="Filter tasks by priority"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Project Filter */}
              <div>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  aria-label="Filter tasks by project"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task List */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                {activeTab === 'my' ? 'My Assigned Tasks' : 'All Tasks'}
              </CardTitle>
              <CardDescription className="text-xs">
                Click on any task row to update its status or notes
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <CheckSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium text-foreground">No tasks found</p>
                <p className="text-xs mt-1">
                  {search || statusFilter || priorityFilter || projectFilter
                    ? 'Try adjusting your search filters to find what you are looking for.'
                    : activeTab === 'my'
                    ? 'You have no assigned tasks at the moment.'
                    : 'No tasks have been created in your projects yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs font-semibold text-muted-foreground">
                      <th className="pb-3 pr-4">Task</th>
                      <th className="pb-3 px-3">Project</th>
                      <th className="pb-3 px-3">Status</th>
                      <th className="pb-3 px-3">Priority</th>
                      <th className="pb-3 px-3">Due Date</th>
                      <th className="pb-3 px-3">Assignee</th>
                      <th className="pb-3 pl-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {tasks.map((task) => {
                      const isOverdue =
                        task.dueDate &&
                        new Date(task.dueDate) < now &&
                        task.status !== 'DONE';

                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-accent/40 transition-colors cursor-pointer"
                          onClick={() => handleOpenEdit(task)}
                        >
                          <td className="py-3.5 pr-4">
                            <div className="font-medium text-foreground text-sm">{task.title}</div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            {task.project ? (
                              <Link
                                href={`/projects/${task.projectId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                <FolderKanban className="h-3 w-3" />
                                {task.project.name}
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <Badge
                              variant={
                                task.status === 'DONE'
                                  ? 'healthy'
                                  : task.status === 'BLOCKED'
                                  ? 'destructive'
                                  : task.status === 'IN_PROGRESS'
                                  ? 'default'
                                  : 'muted'
                              }
                              className="text-[11px]"
                            >
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                task.priority === 'URGENT'
                                  ? 'bg-rose-100 text-rose-700'
                                  : task.priority === 'HIGH'
                                  ? 'bg-amber-100 text-amber-700'
                                  : task.priority === 'MEDIUM'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-xs">
                            {task.dueDate ? (
                              <span className={isOverdue ? 'text-rose-600 font-semibold flex items-center gap-1' : 'text-muted-foreground'}>
                                {isOverdue && <Clock className="h-3 w-3 shrink-0" />}
                                {formatDate(task.dueDate)}
                                {isOverdue && ' (Overdue)'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 italic">No due date</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            {task.assignee ? (
                              <div className="flex items-center gap-1.5">
                                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                  {task.assignee.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs text-foreground truncate max-w-[120px]">
                                  {task.assignee.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 pl-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(task);
                              }}
                            >
                              Update
                            </Button>
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

        {/* Update Task Status Dialog */}
        <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
          {editingTask && (
            <form onSubmit={handleSaveEdit}>
              <DialogHeader>
                <DialogTitle>Update Task Status</DialogTitle>
                <DialogDescription>
                  {editingTask.title} — {editingTask.project?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                    aria-label="Task Status"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Notes / Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Add progress notes or status details..."
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTask(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTaskMutation.isPending}>
                  {updateTaskMutation.isPending ? 'Saving...' : 'Save Updates'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
