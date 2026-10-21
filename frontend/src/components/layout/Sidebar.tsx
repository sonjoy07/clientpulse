'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  Milestone,
  DollarSign,
  AlertTriangle,
  FileText,
  UserCheck,
  ShieldAlert,
  LogOut,
  Building2,
  Activity,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user, logout, isClient } = useAuth();

  // Internal user navigation
  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const internalNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Clients',
      href: '/clients',
      icon: Users,
      roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER'],
    },
    {
      label: 'Projects',
      href: '/projects',
      icon: FolderKanban,
    },
    {
      label: isTeamMember ? 'My Tasks' : 'Tasks',
      href: '/tasks',
      icon: CheckSquare,
      roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'TEAM_MEMBER'],
    },
    {
      label: 'Resources',
      href: '/resources',
      icon: UserCheck,
      roles: ['SUPER_ADMIN', 'ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD'],
    },
    {
      label: 'System Health',
      href: '/system',
      icon: Activity,
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
    {
      label: 'My Profile',
      href: '/profile',
      icon: UserCircle,
    },
  ];

  // Client Portal navigation
  const clientNavItems: NavItem[] = [
    {
      label: 'Overview',
      href: '/portal/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'My Projects',
      href: '/portal/projects',
      icon: FolderKanban,
    },
    {
      label: 'My Account',
      href: '/profile',
      icon: UserCircle,
    },
  ];

  const items = isClient ? clientNavItems : internalNavItems;

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r border-border bg-card/60 backdrop-blur-xl',
        className,
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-border/80">
        <Link href={isClient ? '/portal/dashboard' : '/dashboard'} className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-md shadow-primary/25">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-foreground text-base">ClientPulse</span>
            <span className="block text-[10px] uppercase font-semibold text-muted-foreground tracking-wider -mt-0.5">
              {isClient ? 'Client Portal' : 'Enterprise SaaS'}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {isClient ? 'Portal Menu' : 'Workspace'}
        </div>
        {items.map((item) => {
          if (item.roles && user && !item.roles.includes(user.role)) {
            return null;
          }

          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/portal/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session Profile & Logout Footer */}
      <div className="border-t border-border p-4">
        {user && (
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="truncate">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0 uppercase tracking-wider">
              {user.role.replace('_', ' ')}
            </Badge>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="w-full justify-start text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30"
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
