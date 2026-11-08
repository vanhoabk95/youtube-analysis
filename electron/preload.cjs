const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  load: () => ipcRenderer.invoke('library:load'),
  start: (input) => ipcRenderer.invoke('job:start', input),
  cancel: () => ipcRenderer.invoke('job:cancel'),
  export: (ids, format) => ipcRenderer.invoke('library:export', ids, format),
  remove: (id) => ipcRenderer.invoke('library:remove', id),
  openVideo: (id) => ipcRenderer.invoke('video:open', id),
  onEvent: (callback) => { const listener = (_event, data) => callback(data); ipcRenderer.on('job:event', listener); return () => ipcRenderer.removeListener('job:event', listener); },
});
