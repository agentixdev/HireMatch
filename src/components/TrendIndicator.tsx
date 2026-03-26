interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable';
  value?: string;
}

export default function TrendIndicator({ trend, value }: TrendIndicatorProps) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400">
        {value ?? 'Trending'}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 2.5L9.5 6.5H2.5L6 2.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
    );
  }

  if (trend === 'down') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-400">
        {value ?? 'Down'}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M6 9.5L2.5 5.5H9.5L6 9.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-white/40">
      {value ?? 'Stable'}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="2" y="5" width="8" height="2" rx="1" fill="currentColor" />
      </svg>
    </span>
  );
}
