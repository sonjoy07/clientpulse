'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { projectsApi } from '@/lib/api/services';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const updateProjectSchema = z
  .object({
    name: z.string().min(2, 'Project name must be at least 2 characters'),
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

type UpdateProjectFormData = z.infer<typeof updateProjectSchema>;

export default function EditProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: projectRes, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  });

  const project = projectRes?.data;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProjectFormData>({
    resolver: zodResolver(updateProjectSchema),
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || '',
        status: project.status,
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        endDate: project.endDate ? project.endDate.split('T')[0] : '',
      });
    }
  }, [project, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProjectFormData) =>
      projectsApi.update(projectId, {
        name: data.name,
        description: data.description || undefined,
        status: data.status,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      }),
    onSuccess: () => {
      toast.success('Project updated successfully');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push(`/projects/${projectId}`);
    },
    onError: (err: any) => {
      toast.error('Failed to update project', {
        description: err?.message || 'Please check your inputs.',
      });
    },
  });

  const onSubmit = (data: UpdateProjectFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <DashboardLayout
      title="Edit Project"
      description="Update delivery status, milestone dates, and scope details."
      requiredRoles={['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER']}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Project Dashboard
        </Link>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Edit Project Information</CardTitle>
            <CardDescription className="text-xs">
              Client: {project?.client?.companyName || project?.client?.name || 'Loading...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="name">
                    Project Title *
                  </label>
                  <Input
                    id="name"
                    disabled={isSubmitting}
                    {...register('name')}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="description">
                    Description / Deliverables Scope
                  </label>
                  <textarea
                    id="description"
                    rows={3}
                    disabled={isSubmitting}
                    {...register('description')}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground" htmlFor="status">
                      Status
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
                      <option value="CANCELLED">Cancelled</option>
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
                  <Link href={`/projects/${projectId}`}>
                    <Button type="button" variant="outline" size="sm">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" size="sm" disabled={isSubmitting} className="gap-2">
                    <Save className="h-4 w-4" />
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
