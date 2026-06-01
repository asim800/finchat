// Recharts projection chart: expected line + low/high band + retirement-age marker.
// Inline Recharts (not via ChartDisplay) since this page is disposable per the
// architecture philosophy — keep it self-contained, swappable without touching others.

'use client';

import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import type { RetirementProjection } from '@/lib/retirement/types';

interface Props {
  projection: RetirementProjection;
}

// Compact $ formatter: $1.2M, $850K, $40K, $200
function fmtCompact(n: number): string {
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

const fmtFull = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function ProjectionChart({ projection }: Props) {
  // Reshape the path so Recharts can render the band as a stacked Area between low/high.
  // Trick: an Area dataKey can be a [low, high] tuple to render as a band directly.
  const data = projection.path.map((p) => ({
    age: p.age,
    band: [p.low, p.high] as [number, number],
    expected: p.expected,
  }));

  return (
    <div className="rounded-lg border bg-card p-3 md:p-4">
      <div className="h-[200px] md:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
            <XAxis dataKey="age" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11 }} width={56} />
            <Tooltip
              formatter={(value: unknown, name: string) => {
                if (Array.isArray(value)) {
                  const [lo, hi] = value as [number, number];
                  return [`${fmtFull.format(lo)} – ${fmtFull.format(hi)}`, '±2% band'];
                }
                return [fmtFull.format(value as number), name === 'expected' ? 'Expected' : name];
              }}
              labelFormatter={(age) => `Age ${age}`}
              contentStyle={{ fontSize: '0.8rem' }}
            />
            {/* Band: low–high envelope */}
            <Area
              type="monotone"
              dataKey="band"
              stroke="none"
              fill="#82ca9d"
              fillOpacity={0.18}
              isAnimationActive={false}
            />
            {/* Expected line */}
            <Line
              type="monotone"
              dataKey="expected"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {/* Retirement-age marker */}
            <ReferenceLine
              x={projection.retirementAge}
              stroke="#f59e0b"
              strokeDasharray="4 2"
              label={{ value: 'Retire', position: 'top', fontSize: 11, fill: '#f59e0b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
