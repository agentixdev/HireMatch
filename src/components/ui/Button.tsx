'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const variantStyles = {
  primary:
    'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-500',
  secondary:
    'bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10',
  ghost:
    'bg-transparent text-white hover:bg-white/5',
  danger:
    'bg-red-500/10 text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
};

interface ButtonProps {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  className,
  children,
  onClick,
  type = 'button',
  href,
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
    variantStyles[variant],
    sizeStyles[size],
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    className
  );

  if (href) {
    return (
      <motion.div whileTap={{ scale: 0.97 }} className="inline-flex">
        <Link href={href} className={classes}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes}
    >
      {children}
    </motion.button>
  );
}
