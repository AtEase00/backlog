import { contextBridge, ipcRenderer } from 'electron'
import type { ShortcutApi, TodoApi, TodoUpdate, WindowApi } from '../shared/todo'

const todoApi: TodoApi = {
  list: () => ipcRenderer.invoke('todos:list'),
  create: (title: string) => ipcRenderer.invoke('todos:create', title),
  update: (id: string, changes: TodoUpdate) => ipcRenderer.invoke('todos:update', id, changes),
  remove: (id: string) => ipcRenderer.invoke('todos:remove', id)
}

contextBridge.exposeInMainWorld('todos', todoApi)

const windowApi: WindowApi = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleSide: () => ipcRenderer.invoke('window:toggle-side'),
  close: () => ipcRenderer.invoke('window:close')
}

contextBridge.exposeInMainWorld('windowControls', windowApi)

const shortcutApi: ShortcutApi = {
  get: () => ipcRenderer.invoke('shortcut:get'),
  set: (accelerator: string) => ipcRenderer.invoke('shortcut:set', accelerator)
}

contextBridge.exposeInMainWorld('shortcut', shortcutApi)
