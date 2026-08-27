const { contextBridge, ipcRenderer } = require('electron');

const nativeApi = {
  invoke(channel: string, args: any) {
    return ipcRenderer.invoke(channel, args);
  },
  on(event: string, listener: (data: any) => void) {
    const handler = (_e: any, data: any) => listener(data);
    ipcRenderer.on(event, handler);
    return () => {
      ipcRenderer.removeListener(event, handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', nativeApi);
contextBridge.exposeInMainWorld('api', nativeApi);
