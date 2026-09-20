import { metricValue } from '@health/shared/insights'
import { Band, type DailyRecord, type MetricId } from '@health/shared/schema'
import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { chartColor } from '../../lib/chartColors'
import { formatMetric } from '../../lib/format'

export function MetricChart({
  records,
  metricId,
  goalTarget,
}: {
  records: DailyRecord[]
  metricId: MetricId
  goalTarget: number | null
}) {
  const data = records.map((r) => ({ date: r.date, value: metricValue(r, metricId) }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke={chartColor('line')} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => format(parseISO(d), 'MMM d')}
            stroke={chartColor('ink-muted')}
            minTickGap={32}
          />
          <YAxis stroke={chartColor('ink-muted')} width={48} />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: `1px solid ${chartColor('line')}`,
            }}
            formatter={(value) => formatMetric(typeof value === 'number' ? value : null, metricId)}
            labelFormatter={(label) => format(parseISO(String(label)), 'EEE d MMM')}
          />
          {goalTarget !== null && (
            <ReferenceLine
              y={goalTarget}
              stroke={chartColor(Band.Good)}
              strokeDasharray="4 4"
              label={{ value: 'goal', position: 'right', fill: chartColor('ink-muted') }}
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={chartColor(Band.Steady)}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
