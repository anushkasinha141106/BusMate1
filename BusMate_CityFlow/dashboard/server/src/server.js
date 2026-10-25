import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const privateDir = path.resolve(here, '../private')
const usersFile = process.env.USERS_FILE || path.join(privateDir, 'users.json')
const allowed = new Set(['metrics.json', 'forecast_sample.json', 'plans.json', 'routes.json', 'decision_metrics.json', 'rolling_metrics.json', 'tradeoff.json'])
const secret = process.env.JWT_SECRET
if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be set and at least 32 characters long')

const app = express()
app.disable('x-powered-by')
app.use(helmet())
app.use(express.json({ limit: '8kb' }))
app.use(cookieParser())

const attempts = new Map()
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => res.status(429).json({ error: 'Too many failed attempts. Try again later.' }),
})
const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000, path: '/' }
function authenticate(req, res, next) {
  try { req.user = jwt.verify(req.cookies.cityflow_token || '', secret); next() }
  catch { res.status(401).json({ error: 'Authentication required' }) }
}

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {}
  try {
    const users = JSON.parse(await readFile(usersFile, 'utf8'))
    const user = users.find((entry) => entry.username === username)
    const valid = typeof password === 'string' && user && await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' })
    const token = jwt.sign({ username: user.username, role: user.role }, secret, { expiresIn: '8h' })
    res.cookie('cityflow_token', token, cookieOptions).json({ username: user.username, role: user.role })
  } catch {
    res.status(401).json({ error: 'Invalid username or password' })
  }
})
app.post('/api/auth/logout', (_req, res) => res.clearCookie('cityflow_token', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' }).sendStatus(204))
app.get('/api/auth/me', authenticate, (req, res) => res.json({ username: req.user.username, role: req.user.role }))
app.get('/api/d2/:file', authenticate, async (req, res) => {
  const { file } = req.params
  if (!allowed.has(file) || path.basename(file) !== file || file.includes('..')) return res.sendStatus(404)
  try {
    const target = path.resolve(privateDir, 'd2', file)
    if (!target.startsWith(path.resolve(privateDir, 'd2') + path.sep)) return res.sendStatus(400)
    const contents = await readFile(target)
    res.type('application/json').send(contents)
  } catch { res.sendStatus(404) }
})
app.use((_req, res) => res.sendStatus(404))

const port = Number(process.env.PORT || 5180)
const host = process.env.HOST || '127.0.0.1'
app.listen(port, host, () => console.log(`CityFlow API listening on ${host}:${port}`))
