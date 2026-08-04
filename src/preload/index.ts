import { contextBridge, ipcRenderer } from 'electron'
import type { LanguagePreference, LocaleApi, ShortcutApi, TodoApi, TodoUpdate, WindowApi } from '../shared/todo'

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
  onOpenSettings: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('settings:open', listener)
    return () => ipcRenderer.removeListener('settings:open', listener)
  }
}

contextBridge.exposeInMainWorld('windowControls', windowApi)

const shortcutApi: ShortcutApi = {
  get: () => ipcRenderer.invoke('shortcut:get'),
  set: (accelerator: string) => ipcRenderer.invoke('shortcut:set', accelerator)
}

contextBridge.exposeInMainWorld('shortcut', shortcutApi)

const localeApi: LocaleApi = {
  get: () => ipcRenderer.invoke('locale:get'),
  set: (language: LanguagePreference) => ipcRenderer.invoke('locale:set', language)
}

contextBridge.exposeInMainWorld('locale', localeApi)
