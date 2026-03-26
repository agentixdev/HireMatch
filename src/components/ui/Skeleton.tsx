import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-lg bg-white/[0.06]', className)}
    />
  );
}

export function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-5 space-y-4"
    >
      {/* Image area */}
      <Skeleton className="h-32 w-full rounded-lg" />
      {/* Text lines */}
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
