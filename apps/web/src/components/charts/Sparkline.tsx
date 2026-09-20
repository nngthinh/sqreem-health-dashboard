import { Band, type SparkPoint } from '@health/shared/schema'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import { chartColor } from '../../lib/chartColors'
import { toChartPoints } from '../../lib/chartSeries'

export function Sparkline({
  series,
  tone = Band.Steady,
  height = 36,
}: {
  series: SparkPoint[]
  tone?: Band
  height?: number
}) {
  // Unrecorded days are stored as null and plotted as 0, so the line stays continuous.
  const points = toChartPoints(series)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <YAxis hide domain={['dataMin', 'dataMax']} />
        <Line
          type="monotone"
          dataKey="value"
          stroke={chartColor(tone)}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
