const { contextBridge, ipcRenderer } = require('electron');

const api = {
  invoke(channel, args) {
    return ipcRenderer.invoke(channel, args);
  },
  on(event, listener) {
    const handler = (_e, data) => listener(data);
    ipcRenderer.on(event, handler);
    return () => {
      ipcRenderer.removeListener(event, handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
contextBridge.exposeInMainWorld('api', api);
