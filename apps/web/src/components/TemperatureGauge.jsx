export default function TemperatureGauge({ value = 0, size = 140, thickness = 10 }) {
  const clamped = Math.min(Math.max(Number(value), 0), 100);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (clamped / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  const hue = ((100 - clamped) / 100) * 200;
  const color = `hsl(${hue}, 80%, 50%)`;

  const needleAngle = (clamped / 100) * 180 - 90;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLen = radius * 0.7;
  const nx = cx + needleLen * Math.cos(needleRad);
  const ny = cy + needleLen * Math.sin(needleRad);

  return (
    <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
      <defs>
        <linearGradient id="tempGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="25%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="75%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>

      <path
        d={`M ${thickness} ${cy} A ${radius} ${radius} 0 0 1 ${size - thickness} ${cy}`}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={thickness}
        strokeLinecap="round"
      />

      <path
        d={`M ${thickness} ${cy} A ${radius} ${radius} 0 0 1 ${size - thickness} ${cy}`}
        fill="none"
        stroke="url(#tempGaugeGrad)"
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference * 0.25}
      />

      <line
        x1={cx}
        y1={cy}
        x2={nx}
        y2={ny}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />

      <circle cx={cx} cy={cy} r={4} fill={color} />

      <text x={cx} y={size * 0.58} textAnchor="middle" fill="#d9edff" fontSize={13} fontWeight="bold">
        {clamped.toFixed(1)}%
      </text>
    </svg>
  );
}
