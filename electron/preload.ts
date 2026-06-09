import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (defaultPath: string, content: string) =>
    ipcRenderer.invoke('save-file', { defaultPath, content }),
  openFile: () => ipcRenderer.invoke('open-file'),
})

export interface ElectronAPI {
  saveFile: (defaultPath: string, content: string) => Promise<string | null>
  openFile: () => Promise<{ filePath: string; content: string } | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
