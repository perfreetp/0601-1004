import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (args: { defaultPath: string; dataUrl?: string; buffer?: ArrayBuffer }) =>
    ipcRenderer.invoke('save-file', args),
  saveFiles: (items: { filename: string; buffer: ArrayBuffer }[]) =>
    ipcRenderer.invoke('save-files', items),
  openFile: () => ipcRenderer.invoke('open-file'),
})

export interface ElectronAPI {
  saveFile: (args: { defaultPath: string; dataUrl?: string; buffer?: ArrayBuffer }) => Promise<string | null>
  saveFiles: (items: { filename: string; buffer: ArrayBuffer }[]) => Promise<{ saved: number; folder: string | null } | null>
  openFile: () => Promise<{ filePath: string; content: string } | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
