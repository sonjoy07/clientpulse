'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, UserPlus, Shield, UserCheck, AlertTriangle } from 'lucide-react';
import { projectMembersApi, resourcesApi } from '@/lib/api/services';
import { ProjectMember } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ProjectTeamTabProps {
  projectId: string;
  canManage?: boolean;
}

export function ProjectTeamTab({ projectId, canManage = true }: ProjectTeamTabProps) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [allocationPercentage, setAllocationPercentage] = useState(50);
  const [projectRole, setProjectRole] = useState('Developer');

  // Queries
  const { data: membersRes, isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: () => projectMembersApi.list(projectId, { limit: 100 }),
  });

  const { data: resourcesRes } = useQuery({
    queryKey: ['resources', 'add-member-options'],
    queryFn: () => resourcesApi.getOverview({ limit: 100 }),
    enabled: addDialogOpen,
  });

  const members = membersRes?.data || [];
  const availableResources = resourcesRes?.data || [];

  const addMutation = useMutation({
    mutationFn: (data: any) => projectMembersApi.add(projectId, data),
    onSuccess: () => {
      toast.success('Team member assigned to project');
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setAddDialogOpen(false);
      setSelectedUserId('');
      setAllocationPercentage(50);
      setProjectRole('Developer');
    },
    onError: (err: any) => {
      toast.error('Failed to assign team member', { description: err?.message });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => projectMembersApi.remove(projectId, memberId),
    onSuccess: () => {
      toast.success('Team member removed from project');
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setRemoveMemberId(null);
    },
    onError: (err: any) => {
      toast.error('Failed to remove team member', { description: err?.message });
      setRemoveMemberId(null);
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a team member');
      return;
    }
    addMutation.mutate({
      userId: selectedUserId,
      allocationPercentage: Number(allocationPercentage),
      projectRole,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Resource Allocation</h3>
          <p className="text-xs text-muted-foreground">Team members and committed capacity percentages</p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setAddDialogOpen(true)} className="gap-2 text-xs">
            <UserPlus className="h-4 w-4" />
            Assign Member
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
          ) : members.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No team members allocated to this project yet.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-card gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground text-sm block">
                        {member.user.name}
                      </span>
                      <span className="text-xs text-muted-foreground block">{member.user.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <div>
                      <span className="block text-[11px] text-muted-foreground">Role</span>
                      <span className="font-medium text-foreground">{member.projectRole}</span>
                    </div>

                    <div className="w-28">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span>Allocation</span>
                        <span className="font-semibold text-foreground">
                          {member.allocationPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            member.allocationPercentage > 100
                              ? 'bg-rose-500'
                              : member.allocationPercentage >= 90
                              ? 'bg-amber-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(100, member.allocationPercentage)}%` }}
                        />
                      </div>
                    </div>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemoveMemberId(member.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Remove member</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogHeader>
          <DialogTitle>Assign Team Member</DialogTitle>
          <DialogDescription>
            Allocate internal team capacity and designate project delivery role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAdd} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold" htmlFor="user-select">
              Select User *
            </label>
            <select
              id="user-select"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
              required
            >
              <option value="">Choose team member...</option>
              {availableResources.map((res) => (
                <option key={res.userId} value={res.userId}>
                  {res.name} — ({res.availableCapacityPercentage}% available)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="alloc-pct">
                Allocation Percentage (%) *
              </label>
              <Input
                id="alloc-pct"
                type="number"
                min="1"
                max="100"
                value={allocationPercentage}
                onChange={(e) => setAllocationPercentage(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold" htmlFor="proj-role">
                Project Role *
              </label>
              <Input
                id="proj-role"
                value={projectRole}
                onChange={(e) => setProjectRole(e.target.value)}
                placeholder="e.g. Lead Architect"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Assigning...' : 'Assign Member'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!removeMemberId} onOpenChange={(open) => !open && setRemoveMemberId(null)}>
        <DialogHeader>
          <DialogTitle>Remove Project Member</DialogTitle>
          <DialogDescription>
            Are you sure you want to release this team member from this project? Their allocated capacity will be restored to their available pool.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setRemoveMemberId(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => removeMemberId && removeMutation.mutate(removeMemberId)}
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? 'Removing...' : 'Confirm Remove'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
