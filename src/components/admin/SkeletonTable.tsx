'use client';

import { Card } from '@/components/ui/card';

interface SkeletonTableProps {
  rows?: number;
}

export default function SkeletonTable({ rows = 6 }: SkeletonTableProps) {
  return (
    <Card className="shadow-sm overflow-hidden">
      {/* Header skeleton */}
      <div className="hidden lg:block">
        <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/50 border-b">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-muted rounded h-3 flex-1" style={{ maxWidth: i === 0 ? '2rem' : i === 7 ? '5rem' : undefined }} />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b last:border-0">
          {/* Desktop skeleton row */}
          <div className="hidden lg:flex items-center gap-3 px-3 py-2.5">
            <div className="animate-pulse bg-muted rounded h-4 w-8 shrink-0" />
            <div className="animate-pulse bg-muted rounded h-4 flex-1" />
            <div className="animate-pulse bg-muted rounded h-4 w-20" />
            <div className="animate-pulse bg-muted rounded h-4 w-12" />
            <div className="animate-pulse bg-muted rounded h-4 w-24" />
            <div className="animate-pulse bg-muted rounded h-4 w-28" />
            <div className="animate-pulse bg-muted rounded h-4 w-24" />
            <div className="animate-pulse bg-muted rounded h-4 w-20 shrink-0" />
          </div>
          {/* Mobile skeleton row */}
          <div className="lg:hidden p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="animate-pulse bg-muted rounded h-4 w-32" />
              <div className="animate-pulse bg-muted rounded-full h-4 w-12" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="animate-pulse bg-muted rounded h-3 w-full" />
              <div className="animate-pulse bg-muted rounded h-3 w-full" />
            </div>
            <div className="flex gap-1.5">
              <div className="animate-pulse bg-muted rounded h-7 w-7" />
              <div className="animate-pulse bg-muted rounded h-7 w-16" />
              <div className="animate-pulse bg-muted rounded h-7 w-7" />
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}
