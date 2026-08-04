import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { TodoRepository } from './todoRepository'
import type { TodoUpdate } from '../shared/todo'

type DockSide = 'left' | 'right'

interface AppSettings {
  dockSide: DockSide
  shortcut: string
}

const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+/'
const DEFAULT_WIDTH = 380
let repository: TodoRepository | undefined
let mainWindow: BrowserWindow | undefined
let settings: AppSettings

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function loadSettings(): AppSettings {
  try {
    if (existsSync(settingsPath())) {
      const parsed = JSON.parse(readFileSync(settingsPath(), 'utf8')) as Partial<AppSettings>
      return {
        dockSide: parsed.dockSide === 'left' ? 'left' : 'right',
        shortcut: typeof parsed.shortcut === 'string' ? parsed.shortcut : DEFAULT_SHORTCUT
      }
    }
  } catch {
    // Invalid settings fall back to defaults.
  }
  return { dockSide: 'right', shortcut: DEFAULT_SHORTCUT }
}

function saveSettings(): void {
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8')
}

function dockWindow(window: BrowserWindow, side = settings.dockSide): void {
  const display = screen.getDisplayMatching(window.getBounds())
  const { x, y, width, height } = display.workArea
  const currentWidth = Math.min(Math.max(window.getBounds().width, 320), 560)
  window.setMinimumSize(320, height)
  window.setMaximumSize(560, height)
  window.setBounds({
    x: side === 'left' ? x : x + width - currentWidth,
    y,
    width: currentWidth,
    height
  })
}

function toggleWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    dockWindow(mainWindow)
    mainWindow.show()
    mainWindow.focus()
  }
}

function registerAppShortcut(accelerator: string): boolean {
  globalShortcut.unregisterAll()
  return globalShortcut.register(accelerator, toggleWindow)
}

function createWindow(): void {
  const display = screen.getPrimaryDisplay()
  const icon = join(__dirname, '../../resources/icon.png')
  mainWindow = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: display.workArea.height,
    minWidth: 320,
    minHeight: display.workArea.height,
    maxWidth: 560,
    maxHeight: display.workArea.height,
    backgroundColor: '#f7f7f5',
    title: 'Backlog',
    icon,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  dockWindow(mainWindow)
  mainWindow.on('resize', () => {
    if (mainWindow) dockWindow(mainWindow)
  })
  mainWindow.on('closed', () => {
    mainWindow = undefined
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerTodoHandlers(todoRepository: TodoRepository): void {
  ipcMain.handle('todos:list', () => todoRepository.list())
  ipcMain.handle('todos:create', (_event, title: unknown) => {
    if (typeof title !== 'string') throw new Error('无效的待办标题')
    return todoRepository.create(title)
  })
  ipcMain.handle('todos:update', (_event, id: unknown, changes: unknown) => {
    if (typeof id !== 'string' || !isTodoUpdate(changes)) throw new Error('无效的待办更新')
    return todoRepository.update(id, changes)
  })
  ipcMain.handle('todos:remove', (_event, id: unknown) => {
    if (typeof id !== 'string') throw new Error('无效的待办标识')
    todoRepository.remove(id)
  })
}

function registerWindowHandlers(): void {
  ipcMain.handle('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize())
  ipcMain.handle('window:toggle-side', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    settings.dockSide = settings.dockSide === 'left' ? 'right' : 'left'
    saveSettings()
    if (window) dockWindow(window)
    return settings.dockSide
  })
  ipcMain.handle('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close())
  ipcMain.handle('shortcut:get', () => settings.shortcut)
  ipcMain.handle('shortcut:set', (_event, accelerator: unknown) => {
    if (typeof accelerator !== 'string' || accelerator.length > 80) throw new Error('快捷键无效')
    const previous = settings.shortcut
    if (!registerAppShortcut(accelerator)) {
      registerAppShortcut(previous)
      throw new Error('快捷键已被占用，请换一个组合')
    }
    settings.shortcut = accelerator
    saveSettings()
    return settings.shortcut
  })
}

function isTodoUpdate(value: unknown): value is TodoUpdate {
  if (!value || typeof value !== 'object') return false
  const update = value as Record<string, unknown>
  const keys = Object.keys(update)
  return (
    keys.length > 0 &&
    keys.every((key) => key === 'title' || key === 'completed') &&
    (update.title === undefined || typeof update.title === 'string') &&
    (update.completed === undefined || typeof update.completed === 'boolean')
  )
}

app.whenReady().then(() => {
  settings = loadSettings()
  repository = new TodoRepository(join(app.getPath('userData'), 'backlog.db'))
  registerTodoHandlers(repository)
  registerWindowHandlers()
  createWindow()
  if (!registerAppShortcut(settings.shortcut)) {
    settings.shortcut = DEFAULT_SHORTCUT
    registerAppShortcut(settings.shortcut)
    saveSettings()
  }

  screen.on('display-metrics-changed', () => {
    if (mainWindow) dockWindow(mainWindow)
  })
  screen.on('display-removed', () => {
    if (mainWindow) dockWindow(mainWindow)
  })
  app.on('activate', () => {
    if (!mainWindow) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('before-quit', () => {
  repository?.close()
  repository = undefined
})
