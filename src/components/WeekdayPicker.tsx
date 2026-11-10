import { WEEKDAY_LABELS, WEEKDAY_ORDER } from '../lib/limits'

interface WeekdayPickerProps {
  value: number[]
  onChange: (days: number[]) => void
}

const PRESETS: { label: string; days: number[] }[] = [
  { label: 'Solo hoy', days: [] },
  { label: 'L-V', days: [1, 2, 3, 4, 5] },
  { label: 'Finde', days: [0, 6] },
  { label: 'Todos', days: [0, 1, 2, 3, 4, 5, 6] },
]

export default function WeekdayPicker({ value, onChange }: WeekdayPickerProps) {
  const set = new Set(value)
  const toggle = (d: number) => {
    const next = new Set(set)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    onChange([...next].sort())
  }
  const sameAs = (days: number[]) => days.length === set.size && days.every((d) => set.has(d))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.days)}
            className={`nav-tab ${sameAs(p.days) ? 'active' : ''}`}
            style={{ flexDirection: 'row', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'space-between' }}>
        {WEEKDAY_ORDER.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            className={`weekday-chip ${set.has(d) ? 'active' : ''}`}
            aria-pressed={set.has(d)}
          >
            {WEEKDAY_LABELS[d]}
          </button>
        ))}
      </div>
    </div>
  )
}
