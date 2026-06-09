"use strict";const e=require("electron");e.contextBridge.exposeInMainWorld("electronAPI",{saveFile:i=>e.ipcRenderer.invoke("save-file",i),openFile:()=>e.ipcRenderer.invoke("open-file")});
