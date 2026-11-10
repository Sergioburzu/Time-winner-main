import { getProgressColor } from '../lib/limits'

interface ProgressRingProps {
  value: number      // current value (e.g. minutes earned)
  max: number        // maximum value (e.g. daily limit)
  size?: number      // diameter in px
  strokeWidth?: number
  label?: string
  sublabel?: string
  className?: string
  animate?: boolean
}

export default function ProgressRing({
  value,
  max,
  size = 160,
  strokeWidth = 14,
  label,
  sublabel,
  className = '',
  animate = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percent = max > 0 ? Math.min(1, value / max) : 0
  const offset = circumference - percent * circumference
  const color = getProgressColor(percent * 100)

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        aria-label={`Progreso: ${value} de ${max}`}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(163, 177, 198, 0.35)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: animate ? 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease' : 'none',
            filter: `drop-shadow(0 0 6px ${color}80)`,
          }}
        />
      </svg>
      {/* Center text */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        style={{ fontFamily: 'Fredoka, sans-serif' }}
      >
        {label && (
          <span
            style={{
              fontSize: size * 0.175,
              fontWeight: 700,
              color,
              lineHeight: 1.1,
              transition: 'color 0.4s ease',
            }}
          >
            {label}
          </span>
        )}
        {sublabel && (
          <span
            style={{
              fontSize: size * 0.1,
              color: '#888',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {sublabel}
          </span>
        )}
      </div>
    </div>
  )
}
