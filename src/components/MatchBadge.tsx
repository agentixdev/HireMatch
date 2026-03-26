interface MatchBadgeProps {
  percentage: number;
  size?: 'sm' | 'lg';
}

const dimensions = {
  sm: { width: 40, height: 40, radius: 16, stroke: 3, fontSize: 11 },
  lg: { width: 56, height: 56, radius: 22, stroke: 4, fontSize: 14 },
};

export default function MatchBadge({
  percentage,
  size = 'sm',
}: MatchBadgeProps) {
  const d = dimensions[size];
  const circumference = 2 * Math.PI * d.radius;
  const progress = circumference - (percentage / 100) * circumference;
  const center = d.width / 2;

  return (
    <div className="inline-flex flex-col items-center">
      <svg
        width={d.width}
        height={d.height}
        viewBox={`0 0 ${d.width} ${d.height}`}
        className="-rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={d.radius}
          fill="none"
          stroke="rgba(59,130,246,0.15)"
          strokeWidth={d.stroke}
        />
        {/* Progress ring */}
        <circle
          cx={center}
          cy={center}
          r={d.radius}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={d.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
        />
        {/* Center text */}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          className="rotate-90 origin-center"
          fill="#3B82F6"
          fontSize={d.fontSize}
          fontWeight="bold"
        >
          {percentage}%
        </text>
      </svg>
      {size === 'lg' && (
        <span className="mt-0.5 text-[10px] text-blue-400/70 font-medium">
          Match
        </span>
      )}
    </div>
  );
}
