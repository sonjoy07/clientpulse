'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { clientsApi } from '@/lib/api/services';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const clientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  companyName: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export default function NewClientPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      companyName: '',
      email: '',
      phone: '',
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    try {
      const res = await clientsApi.create(data);
      toast.success('Client created successfully');
      router.push(`/clients/${res.data.id}`);
    } catch (err: any) {
      toast.error('Failed to create client', {
        description: err?.message || 'Please check the form inputs.',
      });
    }
  };

  return (
    <DashboardLayout
      title="Add New Client"
      description="Create a new client profile under your organization."
      requiredRoles={['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER']}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/clients" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Client Directory
        </Link>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Client Information</CardTitle>
            <CardDescription className="text-xs">
              Basic contact and organization details for client-service delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="name">
                  Contact Person Name *
                </label>
                <Input
                  id="name"
                  placeholder="e.g. Sarah Jenkins"
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
                  placeholder="e.g. Acme Innovations Corp"
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
                  placeholder="contact@acme.com"
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
                  placeholder="+1 (555) 019-2834"
                  disabled={isSubmitting}
                  {...register('phone')}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Link href="/clients">
                  <Button type="button" variant="outline" size="sm">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" size="sm" disabled={isSubmitting} className="gap-2">
                  <Save className="h-4 w-4" />
                  {isSubmitting ? 'Saving...' : 'Create Client'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
