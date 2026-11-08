const { app, BrowserWindow, ipcMain, dialog, shell, session } = require('electron');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const fs = require('node:fs/promises');
const path = require('node:path');
const { sourceUrl, formatTranscript } = require('./shared.cjs');
let win, worker, library = [], saveQueue = Promise.resolve();
const isDev = !app.isPackaged && process.argv.includes('--dev');
const libraryPath = () => path.join(app.getPath('userData'), 'library.json');
function persist() {
  const snapshot = JSON.stringify(library);
  saveQueue = saveQueue.catch(() => {}).then(async () => { await fs.mkdir(app.getPath('userData'), { recursive: true }); await fs.writeFile(`${libraryPath()}.tmp`, snapshot, 'utf8'); await fs.rename(`${libraryPath()}.tmp`, libraryPath()); });
  return saveQueue;
}
function send(data) { if (win && !win.isDestroyed()) win.webContents.send('job:event', data); }
function trusted(event) { if (event.sender !== win?.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('Untrusted IPC sender'); }
function handle(name, callback) { ipcMain.handle(name, (event, ...args) => { trusted(event); return callback(...args); }); }
app.whenReady().then(async () => {
  try { library = JSON.parse(await fs.readFile(libraryPath(), 'utf8')); if (!Array.isArray(library)) throw new Error('Invalid library'); }
  catch (error) { if (error.code !== 'ENOENT') { await fs.copyFile(libraryPath(), `${libraryPath()}.backup-${Date.now()}`).catch(() => {}); dialog.showErrorBox('Không thể đọc thư viện', 'Tệp thư viện bị lỗi. Đã thử sao lưu tệp gốc, hãy kiểm tra: ' + libraryPath()); } library = []; }
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  const createWindow = () => {
    win = new BrowserWindow({ width: 1440, height: 940, minWidth: 1024, minHeight: 700, backgroundColor: '#f5f5f7', title: 'Transcript Studio', titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', event => event.preventDefault());
    if (isDev) win.loadURL('http://127.0.0.1:5173'); else win.loadFile(path.join(__dirname, '../dist/index.html'));
  };
  handle('library:load', () => library);
  handle('job:start', input => {
    if (worker) throw new Error('Một tác vụ đang chạy.');
    const url = sourceUrl(input?.url, input?.kind);
    if (!Array.isArray(input.languages) || !input.languages.length || input.languages.length > 10 || input.languages.some(l => typeof l !== 'string' || !/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(l))) throw new Error('Ngôn ngữ không hợp lệ.');
    const root = path.join(__dirname, '..');
    const executable = app.isPackaged ? path.join(process.resourcesPath, 'worker', 'transcript-worker', process.platform === 'win32' ? 'transcript-worker.exe' : 'transcript-worker') : path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
    const child = spawn(executable, app.isPackaged ? [] : ['-u', path.join(root, 'worker/main.py')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    worker = child;
    let terminal = false, cancelled = false, stderr = '';
    child.cancel = () => { cancelled = true; child.kill(); };
    child.stdin.on('error', () => {});
    // Use the main-process library, never a renderer-supplied list of saved IDs.
    const existingIds = library.filter(video => Array.isArray(video.snippets) && video.snippets.length > 0).map(video => video.id);
    child.stdin.end(JSON.stringify({ url, kind: input.kind, languages: input.languages, fallback: input.fallback === true, existingIds, refreshExisting: input.refreshExisting === true }));
    createInterface({ input: child.stdout }).on('line', line => {
      let event; try { event = JSON.parse(line); } catch { return; }
      if (event.type === 'video') { const index = library.findIndex(v => v.id === event.video.id); if (index < 0) library.unshift(event.video); else library[index] = event.video; persist().catch(() => send({ type: 'error', message: 'Không lưu được thư viện trên ổ đĩa.' })); }
      if (['done', 'error'].includes(event.type)) terminal = true;
      send(event);
    });
    child.stderr.on('data', data => { stderr = (stderr + data.toString()).slice(-2000); });
    child.on('error', () => { terminal = true; send({ type: 'error', message: 'Không khởi động được Python worker. Chạy pnpm setup:python trước khi mở ứng dụng.' }); });
    child.on('close', code => { if (worker === child) worker = null; if (cancelled) send({ type: 'cancelled' }); else if (!terminal) send({ type: 'error', message: `Worker đã dừng (${code}). ${stderr}` }); });
    return true;
  });
  handle('job:cancel', () => { worker?.cancel(); });
  handle('library:remove', async id => { if (worker) throw new Error('Hãy chờ hoặc hủy tác vụ trước khi xóa.'); library = library.filter(v => v.id !== id); await persist(); return library; });
  handle('video:open', id => { if (typeof id !== 'string' || !/^[\w-]{11}$/.test(id)) throw new Error('Invalid video'); return shell.openExternal(`https://www.youtube.com/watch?v=${id}`); });
  handle('library:export', async (ids, format) => {
    if (!Array.isArray(ids) || !['txt', 'srt', 'json'].includes(format)) throw new Error('Invalid export');
    const videos = library.filter(v => ids.includes(v.id));
    if (!videos.length) throw new Error('Chưa có transcript để xuất.');
    if (videos.length === 1) {
      const result = await dialog.showSaveDialog(win, { defaultPath: `${videos[0].id}.${format}`, filters: [{ name: format.toUpperCase(), extensions: [format] }] });
      if (result.canceled || !result.filePath) return 0;
      await fs.writeFile(result.filePath, formatTranscript(videos[0], format), 'utf8');
    } else {
      const result = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
      if (result.canceled) return 0;
      const folder = path.join(result.filePaths[0], `Transcripts-${Date.now()}`);
      await fs.mkdir(folder);
      for (const video of videos) await fs.writeFile(path.join(folder, `${video.id}.${format}`), formatTranscript(video, format), 'utf8');
    }
    return videos.length;
  });
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('before-quit', () => worker?.kill());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
