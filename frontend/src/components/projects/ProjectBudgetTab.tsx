'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, DollarSign, TrendingUp, AlertCircle, Trash2, PieChart as PieIcon, Calendar } from 'lucide-react';
import { budgetsApi } from '@/lib/api/services';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { toast } from 'sonner';

interface ProjectBudgetTabProps {
  projectId: string;
  canManage?: boolean;
}

export function ProjectBudgetTab({ projectId, canManage = true }: ProjectBudgetTabProps) {
  const queryClient = useQueryClient();
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [deleteCostId, setDeleteCostId] = useState<string | null>(null);

  // Budget form state
  const [totalBudget, setTotalBudget] = useState('50000');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');

  // Cost entry form state
  const [costAmount, setCostAmount] = useState('');
  const [costCategory, setCostCategory] = useState('DEVELOPMENT');
  const [costDescription, setCostDescription] = useState('');
  const [costIncurredAt, setCostIncurredAt] = useState(new Date().toISOString().split('T')[0]);

  // Queries
  const { data: budgetRes, isLoading: loadingBudget } = useQuery({
    queryKey: ['project-budget', projectId],
    queryFn: () => budgetsApi.get(projectId),
  });

  const { data: summaryRes, isLoading: loadingSummary } = useQuery({
    queryKey: ['project-budget-summary', projectId],
    queryFn: () => budgetsApi.getSummary(projectId),
  });

  const { data: breakdownRes } = useQuery({
    queryKey: ['project-budget-breakdown', projectId],
    queryFn: () => budgetsApi.getBreakdown(projectId),
  });

  const { data: costsRes, isLoading: loadingCosts } = useQuery({
    queryKey: ['project-costs', projectId],
    queryFn: () => budgetsApi.listCosts(projectId, { limit: 100 }),
  });

  const budget = budgetRes?.data;
  const summary = summaryRes?.data;
  const breakdown = breakdownRes?.data || [];
  const costs = costsRes?.data || [];

  // Mutations
  const saveBudgetMutation = useMutation({
    mutationFn: (data: any) =>
      budget ? budgetsApi.update(projectId, data) : budgetsApi.create(projectId, data),
    onSuccess: () => {
      toast.success(budget ? 'Budget updated' : 'Budget created');
      queryClient.invalidateQueries({ queryKey: ['project-budget', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-summary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-health', projectId] });
      setBudgetDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error('Failed to save budget', { description: err?.message });
    },
  });

  const addCostMutation = useMutation({
    mutationFn: (data: any) => budgetsApi.addCost(projectId, data),
    onSuccess: () => {
      toast.success('Cost entry logged');
      queryClient.invalidateQueries({ queryKey: ['project-costs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-summary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-breakdown', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-health', projectId] });
      setCostDialogOpen(false);
      setCostAmount('');
      setCostDescription('');
    },
    onError: (err: any) => {
      toast.error('Failed to add cost entry', { description: err?.message });
    },
  });

  const deleteCostMutation = useMutation({
    mutationFn: (costId: string) => budgetsApi.removeCost(projectId, costId),
    onSuccess: () => {
      toast.success('Cost entry removed');
      queryClient.invalidateQueries({ queryKey: ['project-costs', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-budget-summary', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-health', projectId] });
      setDeleteCostId(null);
    },
    onError: (err: any) => {
      toast.error('Failed to delete cost entry', { description: err?.message });
      setDeleteCostId(null);
    },
  });

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    saveBudgetMutation.mutate({
      totalBudget: Number(totalBudget),
      currency,
      notes: notes || undefined,
    });
  };

  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!costAmount || Number(costAmount) <= 0) {
      toast.error('Valid cost amount is required');
      return;
    }
    addCostMutation.mutate({
      amount: Number(costAmount),
      category: costCategory,
      description: costDescription || undefined,
      incurredAt: costIncurredAt || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Budget Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Allocation
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-24" />
            ) : summary ? (
              <>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(summary.totalBudget, summary.currency)}
                </div>
                {canManage && (
                  <button
                    onClick={() => {
                      setTotalBudget(String(summary.totalBudget));
                      setCurrency(summary.currency);
                      setBudgetDialogOpen(true);
                    }}
                    className="text-xs text-primary hover:underline mt-1 block"
                  >
                    Adjust Budget
                  </button>
                )}
              </>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">Not set</p>
                {canManage && (
                  <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => setBudgetDialogOpen(true)}>
                    Configure
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Incurred Cost
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-24" />
            ) : summary ? (
              <>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(summary.totalSpent, summary.currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.utilizationPercentage}% utilized
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">N/A</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Remaining Budget
            </CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-24" />
            ) : summary ? (
              <>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(summary.remainingBudget, summary.currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.remainingBudget < 0 ? (
                    <span className="text-destructive font-medium">Over budget</span>
                  ) : (
                    <span>Available funds</span>
                  )}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">N/A</p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Burn Rate Health
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <Skeleton className="h-8 w-20" />
            ) : summary ? (
              <div className="mt-1">
                <Badge
                  variant={
                    summary.burnRateStatus === 'NORMAL'
                      ? 'healthy'
                      : summary.burnRateStatus === 'WARNING'
                      ? 'atRisk'
                      : 'critical'
                  }
                  className="text-xs py-1 px-2.5 font-semibold"
                >
                  {summary.burnRateStatus}
                </Badge>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">N/A</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown & Incurred Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Expense Categories</CardTitle>
            <CardDescription className="text-xs">Cost distribution across disciplines</CardDescription>
          </CardHeader>
          <CardContent>
            {breakdown.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No categorized costs recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {breakdown.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-foreground">{item.category}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(item.amount, summary?.currency || 'USD')} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Log Table */}
        <Card className="lg:col-span-2 border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Incurred Cost Entries</CardTitle>
              <CardDescription className="text-xs">Ledger of delivery expenditures</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setCostDialogOpen(true)} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Log Cost
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loadingCosts ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : costs.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No expenditures recorded. Click &quot;Log Cost&quot; to add expense line items.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/80 text-xs font-semibold text-muted-foreground">
                      <th className="pb-2 pr-4">Category</th>
                      <th className="pb-2 px-4">Amount</th>
                      <th className="pb-2 px-4">Description</th>
                      <th className="pb-2 px-4">Incurred Date</th>
                      {canManage && <th className="pb-2 pl-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {costs.map((cost) => (
                      <tr key={cost.id} className="text-xs hover:bg-accent/40">
                        <td className="py-2.5 pr-4 font-medium text-foreground">{cost.category}</td>
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          {formatCurrency(cost.amount, summary?.currency || 'USD')}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">{cost.description || '—'}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{formatDate(cost.incurredAt)}</td>
                        {canManage && (
                          <td className="py-2.5 pl-4 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteCostId(cost.id)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete cost entry</span>
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Set/Update Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogHeader>
          <DialogTitle>{budget ? 'Update Project Budget' : 'Configure Project Budget'}</DialogTitle>
          <DialogDescription>
            Specify total financial allocation cap and baseline currency.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSaveBudget} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Total Allocation Amount *</label>
            <Input
              type="number"
              min="1"
              step="any"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Currency Code</label>
            <Input
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Budget Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Commercial contract or milestone billing notes..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setBudgetDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saveBudgetMutation.isPending}>
              {saveBudgetMutation.isPending ? 'Saving...' : 'Save Budget'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Log Cost Dialog */}
      <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
        <DialogHeader>
          <DialogTitle>Log Expense Line Item</DialogTitle>
          <DialogDescription>Record delivery cost incurred against this project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddCost} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Amount *</label>
              <Input
                type="number"
                min="0.01"
                step="any"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                placeholder="2500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Category</label>
              <select
                value={costCategory}
                onChange={(e) => setCostCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs"
              >
                <option value="DEVELOPMENT">Development</option>
                <option value="DESIGN">Design</option>
                <option value="INFRASTRUCTURE">Infrastructure</option>
                <option value="MARKETING">Marketing</option>
                <option value="OPERATIONS">Operations</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Description</label>
            <Input
              value={costDescription}
              onChange={(e) => setCostDescription(e.target.value)}
              placeholder="e.g. AWS Cloud Cluster & RDS Database (October)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Incurred Date</label>
            <Input
              type="date"
              value={costIncurredAt}
              onChange={(e) => setCostIncurredAt(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setCostDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={addCostMutation.isPending}>
              {addCostMutation.isPending ? 'Logging...' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Cost Dialog */}
      <Dialog open={!!deleteCostId} onOpenChange={(open) => !open && setDeleteCostId(null)}>
        <DialogHeader>
          <DialogTitle>Delete Cost Entry</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove this cost record from project accounting?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setDeleteCostId(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteCostId && deleteCostMutation.mutate(deleteCostId)}
            disabled={deleteCostMutation.isPending}
          >
            {deleteCostMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
