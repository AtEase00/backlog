/// <reference types="vite/client" />

import type { ShortcutApi, TodoApi, WindowApi } from '../../shared/todo'

declare global {
  interface Window {
    todos: TodoApi
    windowControls: WindowApi
    shortcut: ShortcutApi
  }
}

export {}
