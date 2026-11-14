// Starts the backend (server/) and the web app (client/) together.
// Run from the project root with:  npm run dev
// Stop both with Ctrl + C.
import { spawn } from 'node:child_process'

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
