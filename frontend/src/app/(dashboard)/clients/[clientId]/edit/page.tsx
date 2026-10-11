'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { clientsApi } from '@/lib/api/services';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  companyName: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function EditClientPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: clientRes, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.get(clientId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
  });

  useEffect(() => {
    if (clientRes?.data) {
      reset({
        name: clientRes.data.name,
        companyName: clientRes.data.companyName || '',
        email: clientRes.data.email,
        phone: clientRes.data.phone || '',
      });
    }
  }, [clientRes, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: ClientFormData) => clientsApi.update(clientId, data),
    onSuccess: () => {
      toast.success('Client updated successfully');
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      router.push(`/clients/${clientId}`);
    },
    onError: (err: any) => {
      toast.error('Failed to update client', {
        description: err?.message || 'Please check your inputs.',
      });
    },
  });

  const onSubmit = (data: ClientFormData) => {
    updateMutation.mutate(data);
  };

  return (
    <DashboardLayout
      title="Edit Client"
      description="Update client company profile and contact details."
      requiredRoles={['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER']}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href={`/clients/${clientId}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Client Profile
        </Link>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Edit Client Information</CardTitle>
            <CardDescription className="text-xs">
              Changes will update across all linked projects and communications
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
                    Contact Person Name *
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
                  <label className="text-xs font-semibold text-foreground" htmlFor="companyName">
                    Company / Organization Name
                  </label>
                  <Input
                    id="companyName"
                    disabled={isSubmitting}
                    {...register('companyName')}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="email">
                    Email Address *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    disabled={isSubmitting}
                    {...register('email')}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && <p className="text-[11px] text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="phone">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    disabled={isSubmitting}
                    {...register('phone')}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <Link href={`/clients/${clientId}`}>
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
