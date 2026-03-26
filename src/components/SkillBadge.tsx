import { cn } from '@/lib/utils';

type Category = 'tech' | 'soft' | 'language' | 'certification' | 'default';

const categoryColors: Record<Category, { bg: string; text: string }> = {
  tech:          { bg: 'bg-blue-500/10',   text: 'text-blue-500' },
  soft:          { bg: 'bg-purple-500/10',  text: 'text-purple-500' },
  language:      { bg: 'bg-green-500/10',   text: 'text-green-500' },
  certification: { bg: 'bg-amber-500/10',   text: 'text-amber-500' },
  default:       { bg: 'bg-white/[0.06]',   text: 'text-white/60' },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-xs',
};

interface SkillBadgeProps {
  skill: string;
  size?: 'sm' | 'md';
  category?: Category;
}

export default function SkillBadge({
  skill,
  size = 'md',
  category = 'default',
}: SkillBadgeProps) {
  const colors = categoryColors[category];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        colors.bg,
        colors.text,
        sizeStyles[size]
      )}
    >
      {skill}
    </span>
  );
}
