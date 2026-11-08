import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const python = resolve(process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python');
const commands = {
  install: ['-m', 'pip', 'install', '-r', 'worker/requirements.txt'],
  bundle: ['-m', 'PyInstaller', '--noconfirm', '--clean', '--onedir', '--name', 'transcript-worker', '--distpath', 'worker-dist', '--workpath', 'worker-build', '--collect-all', 'youtube_transcript_api', '--collect-all', 'yt_dlp', 'worker/main.py'],
  test: ['-m', 'unittest', 'discover', '-s', 'worker', '-p', 'test_*.py'],
};
const args = commands[process.argv[2]];
if (!args) throw new Error('Expected install, bundle or test');
const result = spawnSync(python, args, { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
