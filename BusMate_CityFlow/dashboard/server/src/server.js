import express from 'express'
import helmet from 'helmet'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

const privateDir = path.resolve(here, '../private')

const allowed = new Set([
  'metrics.json',
  'forecast_sample.json',
  'plans.json',
  'routes.json',
  'decision_metrics.json',
  'rolling_metrics.json',
  'tradeoff.json',
])

const app = express()

app.set('trust proxy', 1)
app.disable('x-powered-by')

app.use(helmet())
app.use(express.json({ limit: '8kb' }))

/*
 * Public CityFlow data endpoint.
 *
 * Authentication has intentionally been removed so that
 * faculty/users can access the deployed dashboard directly.
 *
 * Only the explicitly allowed JSON files can be requested.
 */
app.get('/api/d2/:file', async (req, res) => {
  const { file } = req.params

  // Prevent path traversal and access to arbitrary files.
  if (
    !allowed.has(file) ||
    path.basename(file) !== file ||
    file.includes('..')
  ) {
    return res.sendStatus(404)
  }

  try {
    const d2Dir = path.resolve(privateDir, 'd2')
    const target = path.resolve(d2Dir, file)

    // Extra protection against escaping the D2 directory.
    if (!target.startsWith(d2Dir + path.sep)) {
      return res.sendStatus(400)
    }

    const contents = await readFile(target)

    res.type('application/json').send(contents)
  } catch {
    res.sendStatus(404)
  }
})

// Everything else returns 404.
app.use((_req, res) => {
  res.sendStatus(404)
})

export default app
