'use client';

import React, { useState } from 'react';
import { Menu, X, Activity } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  title?: string;
  description?: string;
}

export function Header({ onToggleMobileMenu, title, description }: HeaderProps) {
  const { user, isClient } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {onToggleMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileMenu}
            className="md:hidden"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div>
          {title && <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>API Connected</span>
        </div>

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <span className="block text-xs font-medium text-foreground">{user.name}</span>
              <span className="block text-[10px] text-muted-foreground capitalize">
                {user.role.toLowerCase().replace('_', ' ')}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
