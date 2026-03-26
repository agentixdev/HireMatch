import { cn } from '@/lib/utils';

const variantStyles = {
  standard: '',
  elevated: 'shadow-xl shadow-black/20',
  interactive: 'hover:ring-white/20 cursor-pointer transition-all',
};

interface CardProps {
  variant?: keyof typeof variantStyles;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export default function Card({
  variant = 'standard',
  className,
  children,
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[#0F172A] ring-1 ring-white/10 rounded-xl p-5',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}
