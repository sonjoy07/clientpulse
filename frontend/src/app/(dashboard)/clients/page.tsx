'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, Edit2, Building2, Phone, Mail, FolderKanban } from 'lucide-react';
import { clientsApi } from '@/lib/api/services';
import { useAuth } from '@/lib/auth/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ClientsListPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canManage = hasRole(['SUPER_ADMIN', 'ADMIN']);

  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientsApi.list({ search: search.trim() || undefined, limit: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => {
      toast.success('Client deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast.error('Failed to delete client', {
        description: err?.message || 'The client may have associated projects.',
      });
      setDeleteId(null);
    },
  });

  const clients = data?.data || [];

  return (
    <DashboardLayout
      title="Client Directory"
      description="Manage enterprise client accounts and associated engagements."
      requiredRoles={['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER']}
    >
      <div className="space-y-6">
        {/* Action Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search clients by name, company, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>

          <Link href="/clients/new">
            <Button className="w-full sm:w-auto gap-2">
              <Plus className="h-4 w-4" />
              Add New Client
            </Button>
          </Link>
        </div>

        {/* Client Cards / Table */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">All Clients ({clients.length})</CardTitle>
            <CardDescription className="text-xs">
              Tenant organizations isolated with RBAC security
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No clients found matching your query.</p>
                <div className="mt-4">
                  <Link href="/clients/new">
                    <Button size="sm">Create First Client</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/80 text-xs font-semibold text-muted-foreground">
                      <th className="pb-3 pr-4">Contact Person</th>
                      <th className="pb-3 px-4">Company Name</th>
                      <th className="pb-3 px-4">Email</th>
                      <th className="pb-3 px-4">Phone</th>
                      <th className="pb-3 px-4 text-center">Projects</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-accent/40 transition-colors">
                        <td className="py-3.5 pr-4 font-medium text-foreground">
                          <Link href={`/clients/${client.id}`} className="hover:underline text-primary">
                            {client.name}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {client.companyName || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground text-xs">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 opacity-60" />
                            <span>{client.email}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground text-xs">
                          {client.phone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 opacity-60" />
                              <span>{client.phone}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            <FolderKanban className="h-3 w-3" />
                            {client._count?.projects ?? 0}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-right space-x-1">
                          <Link href={`/clients/${client.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Edit2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit client</span>
                            </Button>
                          </Link>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(client.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete client</span>
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
            <DialogTitle>Delete Client Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this client? Clients with associated projects cannot be removed until their projects are archived or deleted.
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
