import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld(
  'api', {
    send: (channel: string, data: any) => {
      let validChannels = ['register-new-key', 'start-server', 'stop-server', 'copy-key', 'load-path', 'load-sdwebui-script-path','load-client-key', 'open-directory-dialog', 'open-file-dialog', 'save-path', 'load-auth-data', 'set-auth-data', 'allow-remote-read', 'allow-overwriting', 'load-allow-remote-read', 'load-allow-overwriting'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    receive: (channel: string, func: any) => {
      let validChannels = ['key-updated', 'status-updated', 'key-copied', 'load-path-reply', 'load-sdwebui-script-path-reply', 'load-client-key-reply', 'selected-directory', 'selected-file', 'dots-changed', 'server-started', 'server-stopped', 'load-auth-data-reply', 'allow-remote-read-reply', 'allow-overwriting-reply'];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    }
  }
);

