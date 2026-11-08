import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const [mode, ...options] = process.argv.slice(2);
if (!['dev', 'build'].includes(mode)) {
  console.error('Usage: node scripts/run.mjs dev|build [frontend|--help]');
  process.exit(1);
}
if (options.length === 1 && ['--help', '-h'].includes(options[0])) {
  console.log(mode === 'dev'
    ? 'dev.bat / bash dev.sh: prepare dependencies and start the Electron dev app.'
    : 'build.bat / bash build.sh: prepare dependencies and package the desktop app into release/.\nAdd frontend to build only the Vite frontend into dist/.');
  process.exit(0);
}
if (options.length && !(mode === 'build' && options.length === 1 && options[0] === 'frontend')) {
  console.error('Unknown option. Use --help for usage.');
  process.exit(1);
}
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error('[ERROR] Node.js 22.12+ is required.');
  process.exit(1);
}
const windows = process.platform === 'win32';
function run(command, args, quiet = false) {
  // Only fixed pnpm commands reach the Windows shell; no user-supplied arguments.
  return spawnSync(command, args, {
    cwd: root, stdio: quiet ? 'ignore' : 'inherit',
    shell: windows && command === 'pnpm.cmd',
  });
}
function required(command, args) {
  const result = run(command, args);
  if (result.error) console.error(`[ERROR] ${result.error.message}`);
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}
const pnpm = windows ? 'pnpm.cmd' : 'pnpm';
if (run(pnpm, ['--version'], true).status !== 0) {
  console.error('[ERROR] pnpm was not found. Install pnpm and run this script again.');
  process.exit(1);
}
if (!existsSync(resolve(root, 'node_modules/.modules.yaml'))) {
  console.log('[SETUP] Installing Node dependencies...');
  required(pnpm, ['install', '--frozen-lockfile']);
}
if (mode === 'build' && options[0] === 'frontend') {
  required(pnpm, ['build']);
  console.log('[DONE] Frontend output: dist/');
  process.exit(0);
}
const venvPython = resolve(root, windows ? '.venv/Scripts/python.exe' : '.venv/bin/python');
if (!existsSync(venvPython)) {
  const candidates = windows ? [['py', ['-3']], ['python', []]] : [['python3', []], ['python', []]];
  const python = candidates.find(([command, args]) => run(command, [...args, '-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], true).status === 0);
  if (!python) {
    console.error('[ERROR] Python 3.10+ was not found. Install Python and run this script again.');
    process.exit(1);
  }
  console.log('[SETUP] Creating local Python environment...');
  required(python[0], [...python[1], '-m', 'venv', '.venv']);
}
if (run(venvPython, ['-c', 'import youtube_transcript_api, yt_dlp, PyInstaller'], true).status !== 0) {
  console.log('[SETUP] Installing Python dependencies...');
  required(process.execPath, ['scripts/python.mjs', 'install']);
}
console.log(mode === 'dev' ? '[DEV] Starting Transcript Studio. Press Ctrl+C to stop.' : '[BUILD] Packaging the desktop app for this operating system...');
required(pnpm, [mode === 'dev' ? 'dev' : 'dist']);
if (mode === 'build') console.log('[DONE] Desktop packages: release/');
