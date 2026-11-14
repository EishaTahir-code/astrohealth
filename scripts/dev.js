// Starts the backend (server/) and the web app (client/) together.
// Run from the project root with:  npm run dev
// Stop both with Ctrl + C.
import { spawn } from 'node:child_process'
import net from 'node:net'

// Is something (often an older copy of Orbloom in another terminal) already using this port?
function portBusy(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => resolve(true))
      .once('listening', () => tester.close(() => resolve(false)))
      .listen(port, '127.0.0.1')
  })
}

const busy = []
for (const [port, what] of [[3001, 'the Orbloom server'], [5173, 'the Orbloom app']]) {
  if (await portBusy(port)) busy.push(`  - port ${port} (${what})`)
}
if (busy.length) {
  console.error('\nCannot start: something is already running on')
  console.error(busy.join('\n'))
  console.error('\nThis is usually another copy of Orbloom (for example an older folder) still running in a terminal.')
  console.error('Close that terminal, or click in it and press Ctrl + C, then run "npm run dev" again.\n')
  process.exit(1)
}

const children = [
  ['server', 'server'],
  ['client', 'client'],
].map(([name, cwd]) => {
  const child = spawn('npm', ['run', 'dev'], { cwd, stdio: 'inherit', shell: true })
  child.on('exit', (code) => {
    console.log(`\n${name} stopped (code ${code}). Stopping everything.`)
    stopAll()
  })
  return child
})

function stopAll() {
  for (const c of children) if (!c.killed) c.kill()
  process.exit(0)
}

process.on('SIGINT', stopAll)
