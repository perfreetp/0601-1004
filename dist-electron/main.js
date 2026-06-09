"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const node_url = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __dirname$1 = path.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 768,
    icon: path.join(process.env.VITE_PUBLIC || "", "vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    frame: true,
    backgroundColor: "#0f172a",
    title: "创意设计工作室"
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
    win = null;
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.app.whenReady().then(createWindow);
electron.ipcMain.handle("save-file", async (_event, { defaultPath, content }) => {
  const result = await electron.dialog.showSaveDialog({
    defaultPath,
    filters: [
      { name: "All Files", extensions: ["*"] },
      { name: "Images", extensions: ["png", "jpg", "jpeg"] },
      { name: "PDF", extensions: ["pdf"] }
    ]
  });
  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, content);
    return result.filePath;
  }
  return null;
});
electron.ipcMain.handle("open-file", async () => {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "All Files", extensions: ["*"] },
      { name: "Images", extensions: ["png", "jpg", "jpeg", "svg"] },
      { name: "CSV", extensions: ["csv"] },
      { name: "JSON", extensions: ["json"] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, "utf-8");
    return { filePath, content };
  }
  return null;
});
exports.MAIN_DIST = MAIN_DIST;
exports.RENDERER_DIST = RENDERER_DIST;
exports.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;
