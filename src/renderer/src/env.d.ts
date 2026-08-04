/// <reference types="vite/client" />

import type { LocaleApi, ShortcutApi, TodoApi, WindowApi } from '../../shared/todo'

declare global {
  interface Window {
    todos: TodoApi
    windowControls: WindowApi
    shortcut: ShortcutApi
    locale: LocaleApi
  }
}

export {}
