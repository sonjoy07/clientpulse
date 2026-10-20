'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Building2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginPageContent() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSessionExpired = searchParams.get('expired') === 'true';

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    isSessionExpired ? 'Your session has expired. Please sign in again.' : null,
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleQuickFill = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Password123!', { shouldValidate: true });
  };

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null);
    try {
      await login(data);
      toast.success('Signed in successfully');
    } catch (err: any) {
      const msg = err?.message || 'Invalid email or password. Please try again.';
      setErrorMessage(msg);
      toast.error('Authentication failed', { description: msg });
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">ClientPulse</span>
          </Link>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
            Delivery & Project Health Management
          </p>
        </div>

        <Card className="border border-border/80 shadow-lg shadow-slate-200/50">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-xl font-bold tracking-tight">Sign in to your account</CardTitle>
            <CardDescription className="text-xs">
              Enter your enterprise credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-xs font-semibold text-foreground" htmlFor="email">
                  Work Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  disabled={isSubmitting}
                  {...register('email')}
                  className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-[11px] text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground" htmlFor="password">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    {...register('password')}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full font-medium shadow-sm transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Continue to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            {/* 1-Click Demo Login Shortcuts */}
            <div className="mt-6 pt-5 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Quick Fill Demo Credentials
                </span>
                <span className="text-[10px] text-primary font-mono font-medium">Password123!</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@acme.example.com')}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-primary/10 hover:border-primary/40 text-[11px] font-semibold text-slate-700 transition-colors text-center"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('pm@acme.example.com')}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-primary/10 hover:border-primary/40 text-[11px] font-semibold text-slate-700 transition-colors text-center"
                >
                  PM
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('client.rep@globalretail.example.com')}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-primary/10 hover:border-primary/40 text-[11px] font-semibold text-slate-700 transition-colors text-center"
                >
                  Client
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col border-t border-border/50 py-3 text-center text-xs text-muted-foreground bg-slate-50/50 rounded-b-xl">
            <div className="flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Multi-tenant encrypted session & RBAC isolated</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 p-4">
          <div className="w-full max-w-md h-96 bg-card border rounded-xl animate-pulse" />
        </div>
      }
    >
      <LoginPageContent />
    </React.Suspense>
  );
}
