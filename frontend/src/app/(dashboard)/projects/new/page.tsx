'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { projectsApi, clientsApi } from '@/lib/api/services';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const projectSchema = z
  .object({
    name: z.string().min(2, 'Project name must be at least 2 characters'),
    clientId: z.string().min(1, 'Please select a client'),
    description: z.string().optional(),
    status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    },
  );

type ProjectFormData = z.infer<typeof projectSchema>;

function NewProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('clientId') || '';

  const { data: clientsRes, isLoading: loadingClients } = useQuery({
    queryKey: ['clients', 'select-options'],
    queryFn: () => clientsApi.list({ limit: 100 }),
  });

  const clients = clientsRes?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      clientId: preselectedClientId,
      description: '',
      status: 'PLANNING',
      startDate: '',
      endDate: '',
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    try {
      const res = await projectsApi.create({
        name: data.name,
        clientId: data.clientId,
        description: data.description || undefined,
        status: data.status,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      });
      toast.success('Project created successfully');
      router.push(`/projects/${res.data.id}`);
    } catch (err: any) {
      toast.error('Failed to create project', {
        description: err?.message || 'Please check your inputs and try again.',
      });
    }
  };

  return (
    <DashboardLayout
      title="Create New Project"
      description="Initialize a new delivery engagement with client association."
      requiredRoles={['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER']}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Projects Portfolio
        </Link>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Project Details</CardTitle>
            <CardDescription className="text-xs">
              Configure name, client owner, delivery timeline, and initial status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="name">
                  Project Title *
                </label>
                <Input
                  id="name"
                  placeholder="e.g. NextGen Mobile Banking Re-platform"
                  disabled={isSubmitting}
                  {...register('name')}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="clientId">
                  Client Account *
                </label>
                <select
                  id="clientId"
                  disabled={isSubmitting || loadingClients}
                  {...register('clientId')}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select client organization...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName ? `${c.companyName} (${c.name})` : c.name}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="text-[11px] text-destructive">{errors.clientId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="description">
                  Description / Deliverables Scope
                </label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Outline key client outcomes, scope constraints, and expectations..."
                  disabled={isSubmitting}
                  {...register('description')}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="status">
                    Initial Status
                  </label>
                  <select
                    id="status"
                    disabled={isSubmitting}
                    {...register('status')}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="startDate">
                    Start Date
                  </label>
                  <Input
                    id="startDate"
                    type="date"
                    disabled={isSubmitting}
                    {...register('startDate')}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="endDate">
                    Target End Date
                  </label>
                  <Input
                    id="endDate"
                    type="date"
                    disabled={isSubmitting}
                    {...register('endDate')}
                    className={errors.endDate ? 'border-destructive' : ''}
                  />
                  {errors.endDate && (
                    <p className="text-[11px] text-destructive">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Link href="/projects">
                  <Button type="button" variant="outline" size="sm">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" size="sm" disabled={isSubmitting} className="gap-2">
                  <Save className="h-4 w-4" />
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function NewProjectPage() {
  return (
    <React.Suspense
      fallback={
        <DashboardLayout>
          <div className="p-8 space-y-4 max-w-3xl">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-64 w-full bg-muted rounded-xl animate-pulse" />
          </div>
        </DashboardLayout>
      }
    >
      <NewProjectContent />
    </React.Suspense>
  );
}
