import { Band, type SparkPoint } from '@health/shared/schema'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import { chartColor } from '../../lib/chartColors'

export function Sparkline({
  series,
  tone = Band.Steady,
  height = 36,
}: {
  series: SparkPoint[]
  tone?: Band
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={series} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={chartColor(tone)}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
          // A gap stays a gap: joining across it would draw a day that was never recorded.
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
