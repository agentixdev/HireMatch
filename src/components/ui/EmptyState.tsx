import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  heading: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  heading,
  subtitle,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-4',
        className
      )}
    >
      {icon && <div className="mb-4 text-white/30">{icon}</div>}
      <h3 className="text-sm font-bold text-white">{heading}</h3>
      {subtitle && (
        <p className="mt-1 text-xs text-white/50 max-w-xs">{subtitle}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
