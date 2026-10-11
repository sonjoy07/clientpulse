import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Users,
  AlertTriangle,
  Sparkles,
  BarChart3,
  Clock,
  Layers,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-xs">
              <Activity className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">
              ClientPulse
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#engine" className="hover:text-foreground transition-colors">
              Risk Engine
            </a>
            <a href="#portal" className="hover:text-foreground transition-colors">
              Client Portal
            </a>
            <a href="#architecture" className="hover:text-foreground transition-colors">
              Enterprise Ready
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-sm font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="text-sm font-medium gap-1.5 shadow-xs">
                Launch Workspace
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-semibold text-primary mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Next-Gen Delivery Intelligence Platform
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.15]">
              One place to track delivery, budget, resources, risks, and client communication.
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Eliminate surprise project overruns. ClientPulse combines automated risk detection, real-time workload balancing, and client transparency into an enterprise command center.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 text-base font-medium gap-2 shadow-md">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base font-medium">
                  Explore Architecture
                </Button>
              </a>
            </div>

            {/* Dashboard Mockup Preview */}
            <div className="mt-16 max-w-5xl mx-auto rounded-xl border border-border/80 bg-background shadow-2xl p-2 sm:p-4 overflow-hidden">
              <div className="bg-slate-900 rounded-lg p-4 sm:p-6 text-left text-white space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      https://app.clientpulse.io/dashboard
                    </span>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs bg-emerald-500/10">
                    Live System Active
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-400">Total Delivery Health</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-400">94 / 100</p>
                    <p className="text-[11px] text-slate-400 mt-1">12 of 14 Projects on track</p>
                  </div>
                  <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-400">Org Burn Rate</p>
                    <p className="text-2xl font-bold mt-1 text-white">68.4%</p>
                    <p className="text-[11px] text-slate-400 mt-1">Within budget bounds</p>
                  </div>
                  <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-400">Team Capacity</p>
                    <p className="text-2xl font-bold mt-1 text-blue-400">82%</p>
                    <p className="text-[11px] text-slate-400 mt-1">0 overallocated members</p>
                  </div>
                  <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700/50">
                    <p className="text-xs text-slate-400">AI Report Automation</p>
                    <p className="text-2xl font-bold mt-1 text-purple-400">Scheduled</p>
                    <p className="text-[11px] text-slate-400 mt-1">Sunday 09:00 UTC</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities */}
        <section id="features" className="py-20 bg-background border-y">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-xs font-bold text-primary tracking-wider uppercase">
                Purpose-Built For Client Delivery
              </h2>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                Every critical project dimension under one roof
              </p>
              <p className="mt-4 text-base text-muted-foreground">
                Built specifically for agencies, consultancies, and engineering studios where delivery predictability is non-negotiable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-50 border rounded-xl p-6 space-y-3">
                <div className="p-3 bg-primary/10 text-primary w-fit rounded-lg">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Predictive Risk Scoring</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our proprietary risk engine continuously scans milestones, budget spend velocity, and team capacity to detect slips before clients notice.
                </p>
              </div>

              <div className="bg-slate-50 border rounded-xl p-6 space-y-3">
                <div className="p-3 bg-blue-50 text-blue-600 w-fit rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Capacity Planning</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Avoid engineer burnout and bench waste with real-time percentage allocation tracking across all concurrent client engagements.
                </p>
              </div>

              <div className="bg-slate-50 border rounded-xl p-6 space-y-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 w-fit rounded-lg">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Budget Burn Rate Monitoring</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Compare elapsed timeline against incurred project costs to immediately spot runaway expenses and protect agency profit margins.
                </p>
              </div>

              <div className="bg-slate-50 border rounded-xl p-6 space-y-3">
                <div className="p-3 bg-purple-50 text-purple-600 w-fit rounded-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Automated AI Status Reports</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Background BullMQ worker queues digest commit cadence and completed tasks to generate professional weekly updates ready for stakeholder review.
                </p>
              </div>

              <div className="bg-slate-50 border rounded-xl p-6 space-y-3">
                <div className="p-3 bg-amber-50 text-amber-600 w-fit rounded-lg">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Dedicated Client Portal</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Provide clients with a branded portal showing high-level milestones and progress without exposing internal cost structures or member rates.
                </p>
              </div>

              <div className="bg-slate-50 border rounded-xl p-6 space-y-3">
                <div className="p-3 bg-slate-200 text-slate-800 w-fit rounded-lg">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Multi-Tenant Isolation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Strict organization separation at database level with RBAC guards supporting Super Admins, Project Managers, Team Members, and Clients.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-slate-900 text-white">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to take full control of your agency delivery?
            </h2>
            <p className="text-slate-300 text-base max-w-xl mx-auto">
              Sign in with your enterprise credentials to access your organization dashboard immediately.
            </p>
            <div className="pt-4 flex justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-medium gap-2">
                  Launch ClientPulse
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">ClientPulse</span>
            <span>— The Client Delivery SaaS</span>
          </div>
          <p>© {new Date().getFullYear()} ClientPulse Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
