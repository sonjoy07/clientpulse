'use client';

import { useState } from 'react';
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
  Check,
  X,
  Zap,
  Calendar,
  DollarSign,
  FileText,
  Lock,
  Star,
  ChevronDown,
  ArrowUpRight,
  Sliders,
  Laptop,
  Flame,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Banner Alert */}
      <div className="bg-slate-900 text-slate-300 px-4 py-2 text-xs font-medium text-center border-b border-slate-800 flex items-center justify-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span>
          <strong className="text-white font-semibold">ClientPulse v2.0 Live:</strong> Automated AI Status Reports & Real-Time Capacity Heatmaps are now available.
        </span>
        <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-0.5 ml-1">
          Explore Demo <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight text-foreground leading-none">
                ClientPulse
              </span>
              <span className="text-[10px] text-muted-foreground font-mono font-medium tracking-wide">
                DELIVERY INTELLIGENCE
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors">
              Platform
            </a>
            <a href="#risk-engine" className="hover:text-primary transition-colors">
              Risk Engine
            </a>
            <a href="#portal" className="hover:text-primary transition-colors">
              Client Portal
            </a>
            <a href="#workflow" className="hover:text-primary transition-colors">
              Workflow
            </a>
            <a href="#pricing" className="hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-primary transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-sm font-semibold text-slate-700 hover:text-primary">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="text-sm font-semibold gap-1.5 shadow-sm bg-primary hover:bg-primary/95 text-white">
                Launch Workspace
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-28 overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
          {/* Ambient Glows */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[720px] h-[380px] bg-gradient-to-tr from-blue-500/20 via-indigo-500/15 to-purple-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-48 right-10 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary mb-8 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Predictive Project Governance for Engineering Studios</span>
              <span className="w-1 h-1 rounded-full bg-primary/40"></span>
              <span className="text-blue-700 font-bold">New</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-5xl mx-auto leading-[1.12]">
              Stop Milestone Slips <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Before They Reach Your Clients.
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="mt-7 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              ClientPulse replaces chaotic spreadsheets and awkward Friday night status calls with predictive risk detection, live capacity balancing, and automated executive AI stakeholder reports.
            </p>

            {/* Action Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" className="h-13 px-8 text-base font-semibold gap-2 shadow-lg shadow-blue-500/20 bg-primary hover:bg-blue-700 text-white w-full sm:w-auto">
                  Start Free 14-Day Trial
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="h-13 px-8 text-base font-semibold gap-2 border-slate-300 bg-white/80 hover:bg-white text-slate-800 shadow-xs w-full sm:w-auto">
                  <Laptop className="w-4 h-4 text-slate-600" />
                  View Live Demo Workspace
                </Button>
              </Link>
            </div>

            {/* Social Proof Badges */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Multi-tenant data isolation</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Deploy in 5 minutes</span>
              </div>
            </div>

            {/* High-Fidelity UI Dashboard Showcase */}
            <div className="mt-14 max-w-6xl mx-auto rounded-2xl border border-slate-300/80 bg-slate-900/95 shadow-2xl p-2.5 sm:p-4 text-left backdrop-blur-xl">
              {/* Window Bar */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 px-2">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <div className="hidden sm:flex items-center gap-2 bg-slate-800/90 px-3 py-1 rounded-md text-xs font-mono text-slate-300 border border-slate-700/60">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>https://app.clientpulse.io/acme-engineering/dashboard</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 rounded-full">
                    Pulse Engine Active
                  </span>
                </div>
              </div>

              {/* Mockup Dashboard Content */}
              <div className="pt-4 space-y-4">
                {/* 4 Metric Pill Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span>Delivery Health</span>
                      <span className="text-emerald-400 text-[11px] font-semibold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/50">+4.2%</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">94<span className="text-slate-400 text-sm font-normal"> / 100</span></p>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-400" /> 12 of 14 Projects on schedule
                    </p>
                  </div>

                  <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span>Budget Spend</span>
                      <span className="text-blue-400 text-[11px] font-semibold bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800/50">Optimal</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">$142.5k<span className="text-slate-400 text-sm font-normal"> / $210k</span></p>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: '67.8%' }} />
                    </div>
                  </div>

                  <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span>Team Capacity</span>
                      <span className="text-purple-400 text-[11px] font-semibold bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800/50">Balanced</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">84%<span className="text-slate-400 text-sm font-normal"> Allocated</span></p>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3 text-purple-400" /> 0 engineers overallocated
                    </p>
                  </div>

                  <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60">
                    <div className="flex items-center justify-between text-slate-400 text-xs">
                      <span>Weekly AI Report</span>
                      <span className="text-amber-400 text-[11px] font-semibold bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800/50">Automated</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">Ready<span className="text-slate-400 text-sm font-normal"> to send</span></p>
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" /> 3 digests awaiting PM review
                    </p>
                  </div>
                </div>

                {/* Split View: Live Projects + AI Report Digest */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left Column: Active Projects */}
                  <div className="lg:col-span-2 bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-blue-400" /> Active Client Engagements
                      </h4>
                      <span className="text-xs text-slate-400">Sort by: Risk Score</span>
                    </div>

                    {/* Project Row 1 */}
                    <div className="bg-slate-800/90 rounded-lg p-3 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">Fintech Mobile App Redesign</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-medium">96/100 Healthy</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Client: Apex Global • Milestone 4: Payment Gateway Integration</p>
                      </div>
                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                        <span className="text-xs font-mono text-slate-300 font-semibold">$52,400 / $70,000</span>
                        <span className="text-[11px] text-emerald-400 font-medium">Sprint deadline in 4 days</span>
                      </div>
                    </div>

                    {/* Project Row 2 - At Risk */}
                    <div className="bg-slate-800/90 rounded-lg p-3 border border-amber-800/50 bg-gradient-to-r from-amber-950/20 to-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">Kubernetes & Multi-Cloud Migration</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/50 font-medium">62/100 At Risk</span>
                        </div>
                        <p className="text-xs text-amber-300/80 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" /> Risk detected: Lead backend engineer overallocated by 35%
                        </p>
                      </div>
                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                        <span className="text-xs font-mono text-amber-300 font-semibold">$84,000 / $90,000</span>
                        <span className="text-[11px] text-rose-400 font-medium">High burn velocity</span>
                      </div>
                    </div>

                    {/* Project Row 3 */}
                    <div className="bg-slate-800/90 rounded-lg p-3 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">Enterprise B2B Marketplace</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-medium">91/100 Healthy</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Client: Nordica Retail • Milestone 2: Catalog Search & Filters</p>
                      </div>
                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                        <span className="text-xs font-mono text-slate-300 font-semibold">$34,800 / $65,000</span>
                        <span className="text-[11px] text-slate-400">On budget</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: AI Status Preview */}
                  <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                        <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> AI Client Digest
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">Auto-Generated</span>
                      </div>

                      <div className="mt-3 p-3 rounded-lg bg-slate-900/90 border border-purple-500/20 text-xs space-y-2">
                        <p className="text-white font-medium">Weekly Executive Summary for Apex Global:</p>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          &ldquo;Sprint 4 achieved 100% test coverage on payments. Budget burn remains 6% under forecast with zero critical blockers flagged.&rdquo;
                        </p>
                        <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-[10px] text-slate-400">
                          <span>Model: GPT-4o-Mini</span>
                          <span className="text-emerald-400 font-semibold">Ready to Publish</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/60">
                      <Link href="/login" className="w-full">
                        <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5">
                          Approve & Push to Client Portal
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Counters Bar */}
        <section className="py-12 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-600 mb-8">
              Engineered to protect profitability for world-class agencies and dev studios
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="pt-4 md:pt-0">
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">$18.4M+</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Client Budgets Governed</p>
              </div>
              <div className="pt-4 md:pt-0">
                <p className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">99.4%</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">On-Time Milestone Rate</p>
              </div>
              <div className="pt-4 md:pt-0">
                <p className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">78%</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Fewer Status Meetings</p>
              </div>
              <div className="pt-4 md:pt-0">
                <p className="text-3xl sm:text-4xl font-extrabold text-purple-600 tracking-tight">0</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">Surprise Scope Overruns</p>
              </div>
            </div>
          </div>
        </section>

        {/* Before vs After Contrast */}
        <section className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-50 text-xs px-3 py-1 font-semibold">
                Why Agencies Switch
              </Badge>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                The Old Way vs. The ClientPulse Way
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                See how automated delivery intelligence protects your margins, your team&apos;s sanity, and client trust.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Without ClientPulse */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-rose-200 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                    <X className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Without ClientPulse</h3>
                    <p className="text-xs text-rose-600 font-semibold">Chaotic & Reactive Delivery</p>
                  </div>
                </div>

                <ul className="space-y-4 text-sm text-slate-600">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Surprise Delays:</strong> Discovering a delayed milestone on Friday night right before client demo.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Margin Erosion:</strong> Scope creep silently devours 25-40% of fixed-price contract profits.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Engineer Burnout:</strong> Senior developers get overloaded across 5 projects with no visibility.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Manual Status Calls:</strong> Spending 6+ hours every week compiling repetitive update slide decks.</span>
                  </li>
                </ul>
              </div>

              {/* With ClientPulse */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-emerald-300 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-blue-500" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">With ClientPulse</h3>
                    <p className="text-xs text-emerald-600 font-semibold">Proactive Command & Control</p>
                  </div>
                </div>

                <ul className="space-y-4 text-sm text-slate-700">
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Predictive Alerts:</strong> Algorithmic risk engine flags timeline bottlenecks 14 days ahead.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Budget Burn Tracking:</strong> Real-time cost velocity curves ensure project profitability stays locked.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Capacity Balancing:</strong> Percentage workload matrices ensure no engineer exceeds 100% capacity.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span><strong>Automated AI Reporting:</strong> One-click executive summaries generated from real progress data.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs px-3 py-1 font-semibold">
                Comprehensive Governance Suite
              </Badge>
              <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
                Everything required to scale client delivery
              </h2>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground">
                Built specifically for agencies, consultancies, and engineering studios where delivery predictability is non-negotiable.
              </p>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bento 1: Large Span */}
              <div id="risk-engine" className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-8 text-white border border-slate-800 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center mb-6">
                    <Activity className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="border-blue-400/30 text-blue-400 bg-blue-500/10 text-xs mb-3">
                    Core Algorithm
                  </Badge>
                  <h3 className="text-2xl font-bold tracking-tight text-white">
                    Multi-Factor Predictive Risk Scoring
                  </h3>
                  <p className="mt-3 text-slate-300 text-sm max-w-xl leading-relaxed">
                    ClientPulse calculates a real-time Health Index (0-100) by combining timeline velocity, milestone delays, budget burn acceleration, and team member workload strain. Never be blindsided by a failing milestone again.
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block">Milestone Tracking</span>
                    <span className="text-white font-semibold mt-1 block">Timeline Delta</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Cost Velocity</span>
                    <span className="text-emerald-400 font-semibold mt-1 block">Burn Curve</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Team Strain</span>
                    <span className="text-blue-400 font-semibold mt-1 block">Capacity Model</span>
                  </div>
                </div>
              </div>

              {/* Bento 2: AI Automation */}
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 flex flex-col justify-between hover:border-purple-300 transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50 text-xs mb-3">
                    Background Workers
                  </Badge>
                  <h3 className="text-xl font-bold text-foreground">
                    Automated AI Status Digests
                  </h3>
                  <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                    BullMQ worker queues aggregate task completions, milestone progress, and budget metrics to generate polished stakeholder updates ready for review.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs font-semibold text-purple-700 flex items-center gap-1">
                  Powered by BullMQ & OpenAI / Local LLMs <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Bento 3: Client Portal */}
              <div id="portal" className="bg-slate-50 rounded-2xl p-8 border border-slate-200 flex flex-col justify-between hover:border-emerald-300 transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 text-xs mb-3">
                    Stakeholder Trust
                  </Badge>
                  <h3 className="text-xl font-bold text-foreground">
                    Dedicated Client Portal
                  </h3>
                  <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                    Give clients a secure, branded dashboard to inspect high-level deliverables and milestones without exposing internal cost structures or employee hourly rates.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  Protected Guest Role RBAC <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Bento 4: Capacity Planning */}
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 flex flex-col justify-between hover:border-blue-300 transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                    <Users className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-xs mb-3">
                    Resource Defense
                  </Badge>
                  <h3 className="text-xl font-bold text-foreground">
                    Workload & Capacity Heatmaps
                  </h3>
                  <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                    Percentage-based allocation engine flags over-allocated team members before burnout happens, balancing talent across concurrent client engagements.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs font-semibold text-blue-700 flex items-center gap-1">
                  Cross-Project Resource Balancing <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Bento 5: Multi-Tenant Architecture */}
              <div id="architecture" className="bg-slate-50 rounded-2xl p-8 border border-slate-200 flex flex-col justify-between hover:border-amber-300 transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6">
                    <Layers className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-xs mb-3">
                    Enterprise Isolation
                  </Badge>
                  <h3 className="text-xl font-bold text-foreground">
                    Multi-Tenant RBAC Security
                  </h3>
                  <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                    Strict organization isolation at the database level with role-based access for Super Admins, Project Managers, Team Members, and Clients.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200 text-xs font-semibold text-amber-700 flex items-center gap-1">
                  JWT & Redis Session Guard <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Workflow Section */}
        <section id="workflow" className="py-24 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="outline" className="border-blue-400/30 text-blue-400 bg-blue-500/10 text-xs px-3 py-1 font-semibold">
                How It Works
              </Badge>
              <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
                From project onboarding to live client reporting in 3 steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 relative">
                <span className="text-5xl font-black text-slate-700/60 font-mono absolute top-4 right-4">01</span>
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold mb-4">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Set Milestones & Allocations</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Define key deliverables, target budgets, and assign engineering teammates with explicit weekly capacity percentages.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 relative">
                <span className="text-5xl font-black text-slate-700/60 font-mono absolute top-4 right-4">02</span>
                <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold mb-4">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Continuous Risk Surveillance</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  The automated engine evaluates burn velocity, timeline delta, and team workload 24/7, giving early warnings before issues compound.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/80 relative">
                <span className="text-5xl font-black text-slate-700/60 font-mono absolute top-4 right-4">03</span>
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Automate Stakeholder Reports</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Review and publish AI-synthesized status reports directly to the branded client portal, ending weekend status preparation forever.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs px-3 py-1 font-semibold">
                Transparent Pricing
              </Badge>
              <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
                Predictable pricing for growing studios
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                All plans include automated risk scoring, multi-tenant security, and client portal access.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Starter */}
              <div className="rounded-2xl border border-slate-200 p-8 flex flex-col justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Starter Studio</h3>
                  <p className="text-xs text-muted-foreground mt-1">For small dev teams and boutique agencies.</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">$49</span>
                    <span className="text-xs text-muted-foreground font-medium">/ month</span>
                  </div>

                  <ul className="mt-8 space-y-3.5 text-xs text-slate-600">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Up to 5 Team Members</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>10 Active Client Projects</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Predictive Risk Scoring Engine</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Basic Client Portal Access</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  <Link href="/login" className="w-full">
                    <Button variant="outline" className="w-full font-semibold">
                      Start with Starter
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Agency Pro (Highlighted) */}
              <div className="rounded-2xl border-2 border-primary bg-white p-8 flex flex-col justify-between shadow-xl relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Most Popular
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Agency Pro</h3>
                  <p className="text-xs text-muted-foreground mt-1">For fast-growing engineering & design studios.</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">$129</span>
                    <span className="text-xs text-muted-foreground font-medium">/ month</span>
                  </div>

                  <ul className="mt-8 space-y-3.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-semibold">Up to 25 Team Members</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-semibold">Unlimited Active Client Projects</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Automated AI Weekly Status Reports</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Advanced Workload & Capacity Heatmaps</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Whitelabel Branded Client Portal</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  <Link href="/login" className="w-full">
                    <Button className="w-full bg-primary hover:bg-primary/95 text-white font-semibold shadow-md shadow-blue-500/20">
                      Launch Pro Workspace
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Enterprise */}
              <div className="rounded-2xl border border-slate-200 p-8 flex flex-col justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Enterprise / Self-Host</h3>
                  <p className="text-xs text-muted-foreground mt-1">For large organizations requiring on-prem or private VPS.</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">Custom</span>
                  </div>

                  <ul className="mt-8 space-y-3.5 text-xs text-slate-600">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Unlimited Seats & Organizations</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Private Docker VPS Deployment</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Custom LLM Endpoint (Local or Azure)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Dedicated Support & Custom SLAs</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  <Link href="/login" className="w-full">
                    <Button variant="outline" className="w-full font-semibold">
                      Contact Sales
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <Badge variant="outline" className="border-slate-300 text-slate-700 bg-white text-xs px-3 py-1 font-semibold">
                Got Questions?
              </Badge>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: 'Can clients see internal team hourly rates or margins?',
                  a: 'Never. The Client Portal role is strictly partitioned with granular RBAC. Clients only see milestone progress, deliverable statuses, and approved AI digests. Internal hourly rates, budget burn details, and private notes remain completely invisible to them.',
                },
                {
                  q: 'How does the Predictive Risk Score work?',
                  a: 'ClientPulse calculates a real-time 0-100 score by continuously weighting four factors: Timeline Delta (days ahead/behind schedule), Budget Burn Acceleration (actual spend vs. progress ratio), Task Completion Lead Times, and Team Capacity Strain.',
                },
                {
                  q: 'How does AI status reporting function without risking hallucinations?',
                  a: 'ClientPulse feeds verified database records (completed milestones, logged tasks, and budget velocity metrics) into the LLM with strict JSON schemas and system rules. It only summarizes verified achievements, ensuring zero false status claims.',
                },
                {
                  q: 'Can we self-host ClientPulse on our own VPS or cloud?',
                  a: 'Yes! ClientPulse is fully containerized with Docker Compose (PostgreSQL, Redis, BullMQ Worker, NestJS API, Next.js Frontend, and Nginx). You can deploy it seamlessly on any Ubuntu/Debian VPS or cloud provider.',
                },
              ].map((faq, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-4 text-left font-semibold text-slate-900 flex items-center justify-between gap-4 text-sm sm:text-base hover:bg-slate-50/50"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-500 transition-transform duration-200 shrink-0 ${
                        activeFaq === index ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </button>
                  {activeFaq === index && (
                    <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* High-Converting Bottom CTA */}
        <section className="py-24 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-7">
            <Badge variant="outline" className="border-blue-400/30 text-blue-400 bg-blue-500/10 text-xs px-3.5 py-1 font-semibold">
              Ready to Upgrade Your Agency Delivery?
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Turn delivery uncertainty into your agency&apos;s greatest competitive edge.
            </h2>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
              Join leading engineering studios that use ClientPulse to keep projects on schedule, protect margins, and delight stakeholders.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" className="h-13 px-9 bg-primary hover:bg-blue-600 text-white font-bold text-base gap-2 shadow-lg shadow-blue-500/30 w-full sm:w-auto">
                  Launch Your Workspace Now
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-slate-100 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                  <Activity className="h-4 w-4" />
                </div>
                <span className="font-bold text-foreground">ClientPulse</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The unified delivery intelligence & governance platform for engineering agencies.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-800 mb-3">Product</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><a href="#risk-engine" className="hover:text-primary">Predictive Risk Engine</a></li>
                <li><a href="#portal" className="hover:text-primary">Client Portal</a></li>
                <li><a href="#features" className="hover:text-primary">Capacity Planning</a></li>
                <li><a href="#features" className="hover:text-primary">AI Report Automation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-800 mb-3">Resources</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link href="/login" className="hover:text-primary">Live Demo</Link></li>
                <li><a href="#pricing" className="hover:text-primary">Pricing Plans</a></li>
                <li><a href="#faq" className="hover:text-primary">Documentation & FAQ</a></li>
                <li><a href="#architecture" className="hover:text-primary">Docker VPS Guide</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-800 mb-3">System Status</h4>
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium">All Systems Operational</span>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} ClientPulse Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/login" className="hover:text-primary">Privacy Policy</Link>
              <Link href="/login" className="hover:text-primary">Terms of Service</Link>
              <Link href="/login" className="hover:text-primary">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
