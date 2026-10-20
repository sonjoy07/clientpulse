'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function UnauthorizedPage() {
  return (
    <DashboardLayout
      title="Access Restricted"
      description="You do not have permission to perform this action or view this section."
    >
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center p-6 bg-card rounded-xl border border-border">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Permission Denied</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Your current user role cannot access this resource. Please contact your workspace administrator to request elevated permissions.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/dashboard">
            <Button variant="default" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
