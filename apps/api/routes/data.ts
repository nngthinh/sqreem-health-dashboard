import { getDatasetFor } from '@health/shared/data'
import { buildInsights } from '@health/shared/insights'
import { IsoDateSchema, RangeSchema } from '@health/shared/schema'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppBindings } from '../app.js'

const DEFAULT_RANGE = 30

const RecordsQuerySchema = z.object({
  from: IsoDateSchema.optional(),
  to: IsoDateSchema.optional(),
})

/**
 * In a real product these would front a wearable-sync service; here they read the
 * generated fixture. `getDatasetFor` is the one seam a per-user data source would
 * replace, so the routes never learn where the numbers came from.
 */
export function dataRoutes() {
  const app = new Hono<AppBindings>()

  app.get('/api/profile', (c) => {
    const { persona, goals } = getDatasetFor(c.get('userId'))

    return c.json({ persona, goals })
  })

  app.get('/api/records', (c) => {
    const query = RecordsQuerySchema.safeParse({
      from: c.req.query('from'),
      to: c.req.query('to'),
    })
    if (!query.success) {
      return c.json({ error: 'bad_request', detail: 'from/to must be YYYY-MM-DD' }, 400)
    }

    const { from, to } = query.data
    const { records } = getDatasetFor(c.get('userId'))

    return c.json({
      records: records.filter((r) => (!from || r.date >= from) && (!to || r.date <= to)),
    })
  })

  app.get('/api/insights', (c) => {
    const rawRange = c.req.query('range')
    const range = RangeSchema.safeParse(rawRange === undefined ? DEFAULT_RANGE : Number(rawRange))
    if (!range.success) {
      return c.json({ error: 'bad_request', detail: 'range must be 7, 30 or 90' }, 400)
    }

    const { records, goals } = getDatasetFor(c.get('userId'))
    // The fixture ends today, but reading the last recorded day keeps the answer
    // honest if the window ever stops at a gap.
    const asOf = records.at(-1)?.date ?? new Date().toISOString().slice(0, 10)

    return c.json(buildInsights(records, goals, range.data, asOf))
  })

  return app
}
