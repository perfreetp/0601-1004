"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  saveFile: (defaultPath, content) => electron.ipcRenderer.invoke("save-file", { defaultPath, content }),
  openFile: () => electron.ipcRenderer.invoke("open-file")
});
