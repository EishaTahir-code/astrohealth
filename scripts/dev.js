// Starts the Orbloom web app (client/) for development.
// Run from the project root with:  npm run dev     then open http://localhost:5173
// Stop it with Ctrl + C.
//
// There is no local server any more: accounts, shared records, family messages and the AI
// all live in Supabase (see supabase/ and TECH.md).
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

if (await portBusy(5173)) {
  console.error('\nCannot start: something is already running on port 5173 (the Orbloom app).')
  console.error('This is usually another copy of Orbloom (for example an older folder) still running in a terminal.')
  console.error('Close that terminal, or click in it and press Ctrl + C, then run "npm run dev" again.\n')
  process.exit(1)
}

const child = spawn('npm', ['run', 'dev'], { cwd: 'client', stdio: 'inherit', shell: true })
child.on('exit', (code) => process.exit(code ?? 0))
process.on('SIGINT', () => child.kill())
