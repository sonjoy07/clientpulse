'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { clientPortalApi } from '@/lib/api/services';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FolderKanban,
  Search,
  ArrowRight,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/cn';

export default function ClientProjectsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['client-portal-projects', search, status],
    queryFn: () =>
      clientPortalApi.getProjects({
        search: search || undefined,
        status: status || undefined,
        limit: 50,
      }),
  });

  const projects = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Your Projects
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review deliverables, milestones, and weekly progress updates across your contracts.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search project name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Filter Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="PLANNING">Planning</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Project Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center text-rose-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-semibold">Failed to load projects</p>
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <h3 className="text-base font-semibold">No projects found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your search query or filter settings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj: any) => {
            const timeline = proj.timelineStatus || 'ON_TRACK';
            const progress = proj.progress || 0;
            const milestones = proj.milestoneStats || { total: 0, completed: 0 };

            return (
              <Card key={proj.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-foreground line-clamp-1">
                        {proj.name}
                      </CardTitle>
                      <Badge
                        variant={
                          timeline === 'AHEAD_OF_SCHEDULE'
                            ? 'default'
                            : timeline === 'DELAYED'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-[11px] shrink-0"
                      >
                        {timeline.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-1">
                    {proj.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {proj.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">{progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(proj.endDate)}</span>
                      </div>
                      <span>
                        {milestones.completed}/{milestones.total} Milestones
                      </span>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0">
                  <Link href={`/portal/projects/${proj.id}`} className="w-full block">
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs">
                      <span>View Project Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
