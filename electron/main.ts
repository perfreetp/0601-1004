import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 768,
    icon: path.join(process.env.VITE_PUBLIC || '', 'vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: true,
    backgroundColor: '#0f172a',
    title: '创意设计工作室',
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

ipcMain.handle('save-file', async (_event, { defaultPath, dataUrl, buffer }) => {
  const result = await dialog.showSaveDialog({
    defaultPath,
    filters: [
      { name: 'PNG 图片', extensions: ['png'] },
      { name: 'JPG 图片', extensions: ['jpg', 'jpeg'] },
      { name: 'PDF 文档', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (!result.canceled && result.filePath) {
    try {
      if (buffer) {
        const uint8 = new Uint8Array(buffer)
        fs.writeFileSync(result.filePath, uint8)
      } else if (dataUrl) {
        const commaIdx = dataUrl.indexOf(',')
        const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl
        const fileBuffer = Buffer.from(base64, 'base64')
        fs.writeFileSync(result.filePath, fileBuffer)
      }
      return result.filePath
    } catch (err) {
      console.error('save-file error:', err)
      return null
    }
  }
  return null
})

ipcMain.handle('save-files', async (_event, items: { filename: string; buffer: ArrayBuffer }[]) => {
  const folderResult = await dialog.showOpenDialog({
    title: '选择保存文件夹',
    properties: ['openDirectory', 'promptToCreate'],
  })
  if (folderResult.canceled || !folderResult.filePaths || folderResult.filePaths.length === 0) {
    return { saved: 0, folder: null }
  }
  const folder = folderResult.filePaths[0]
  let saved = 0
  for (const it of items) {
    try {
      const safeName = it.filename.replace(/[\\/:*?"<>|]/g, '_')
      const filePath = path.join(folder, safeName)
      const uint8 = new Uint8Array(it.buffer)
      fs.writeFileSync(filePath, uint8)
      saved++
    } catch (err) {
      console.error('save-files item error:', it.filename, err)
    }
  }
  return { saved, folder }
})

ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] },
      { name: 'CSV', extensions: ['csv'] },
      { name: 'JSON', extensions: ['json'] },
    ],
  })
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0]
    const content = fs.readFileSync(filePath, 'utf-8')
    return { filePath, content }
  }
  return null
})
