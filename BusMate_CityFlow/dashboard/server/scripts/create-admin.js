import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'

const privateDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../private')
await mkdir(privateDir, { recursive: true })
const rl = createInterface({ input: stdin, output: stdout })
const username = (await rl.question('Admin username: ')).trim()
rl.close()
function hiddenPassword(prompt) {
  return new Promise((resolve) => {
    stdout.write(prompt)
    let value = ''
    const wasRaw = Boolean(stdin.isRaw)
    if (stdin.isTTY && stdin.setRawMode) stdin.setRawMode(true)
    stdin.resume()
    const onData = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') { cleanup(); process.exit(130) }
        if (char === '\r' || char === '\n') { cleanup(); stdout.write('\n'); resolve(value); return }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1)
        else if (char >= ' ') value += char
      }
    }
    function cleanup() { stdin.off('data', onData); if (stdin.isTTY && stdin.setRawMode) stdin.setRawMode(wasRaw); stdin.pause() }
    stdin.on('data', onData)
  })
}
const password = await hiddenPassword('Admin password (at least 12 characters): ')
if (!username || password.length < 12) { console.error('Username is required and password must be at least 12 characters.'); process.exit(1) }
const usersPath = path.join(privateDir, 'users.json')
let users = []
try { users = JSON.parse(await readFile(usersPath, 'utf8')) } catch (e) { if (e.code !== 'ENOENT') throw e }
if (users.some((user) => user.username === username)) { console.error('That username already exists.'); process.exit(1) }
users.push({ username, role: 'admin', passwordHash: await bcrypt.hash(password, 12) })
await writeFile(usersPath, `${JSON.stringify(users, null, 2)}\n`, { mode: 0o600 })
console.log('Admin account created.')
