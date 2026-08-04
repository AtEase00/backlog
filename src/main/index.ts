import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { TodoRepository } from './todoRepository'
import type { LanguagePreference, TodoUpdate } from '../shared/todo'

type DockSide = 'left' | 'right'

interface AppSettings {
  dockSide: DockSide
  shortcut: string
  language: LanguagePreference
}

const DEFAULT_SHORTCUT = 'CommandOrControl+Shift+/'
const DEFAULT_WIDTH = 380
let repository: TodoRepository | undefined
let mainWindow: BrowserWindow | undefined
let tray: Tray | undefined
let isQuitting = false
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
        shortcut: typeof parsed.shortcut === 'string' ? parsed.shortcut : DEFAULT_SHORTCUT,
        language: ['system', 'zh-CN', 'en'].includes(parsed.language ?? '')
          ? (parsed.language as LanguagePreference)
          : 'system'
      }
    }
  } catch {
    // Invalid settings fall back to defaults.
  }
  return { dockSide: 'right', shortcut: DEFAULT_SHORTCUT, language: 'system' }
}

function saveSettings(): void {
  writeFileSync(settingsPath(), JSON.stringify(settings, null, 2), 'utf8')
}

function isChinese(): boolean {
  return settings.language === 'zh-CN' || (settings.language === 'system' && app.getLocale().toLowerCase().startsWith('zh'))
}

function labels(): Record<'show' | 'hide' | 'left' | 'right' | 'settings' | 'quit', string> {
  return isChinese()
    ? { show: '显示', hide: '隐藏', left: '停靠左侧', right: '停靠右侧', settings: '设置', quit: '退出 Backlog' }
    : { show: 'Show', hide: 'Hide', left: 'Dock Left', right: 'Dock Right', settings: 'Settings', quit: 'Quit Backlog' }
}

function dockWindow(window: BrowserWindow, side = settings.dockSide): void {
  const display = screen.getDisplayMatching(window.getBounds())
  const { x, y, width, height } = display.workArea
  const currentWidth = Math.min(Math.max(window.getBounds().width, 320), 560)
  window.setMinimumSize(320, height)
  window.setMaximumSize(560, height)
  window.setBounds({ x: side === 'left' ? x : x + width - currentWidth, y, width: currentWidth, height })
}

function showWindow(openSettings = false): void {
  if (!mainWindow) return
  dockWindow(mainWindow)
  mainWindow.show()
  mainWindow.focus()
  if (openSettings) mainWindow.webContents.send('settings:open')
  rebuildTrayMenu()
}

function toggleWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isVisible()) mainWindow.hide()
  else showWindow()
  rebuildTrayMenu()
}

function setDockSide(side: DockSide): void {
  settings.dockSide = side
  saveSettings()
  if (mainWindow) dockWindow(mainWindow)
  rebuildTrayMenu()
}

function rebuildTrayMenu(): void {
  if (!tray) return
  const text = labels()
  tray.setToolTip('Backlog')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: mainWindow?.isVisible() ? text.hide : text.show, click: toggleWindow },
      { type: 'separator' },
      { label: text.left, type: 'radio', checked: settings.dockSide === 'left', click: () => setDockSide('left') },
      { label: text.right, type: 'radio', checked: settings.dockSide === 'right', click: () => setDockSide('right') },
      { type: 'separator' },
      { label: text.settings, click: () => showWindow(true) },
      { type: 'separator' },
      {
        label: text.quit,
        click: () => {
          isQuitting = true
          app.quit()
        }
      }
    ])
  )
}

function createTray(): void {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/icon.png')).resize({ width: 18, height: 18 })
  tray = new Tray(icon)
  tray.on('click', toggleWindow)
  rebuildTrayMenu()
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
    backgroundColor: '#00000000',
    title: 'Backlog',
    icon,
    frame: false,
    transparent: true,
    backgroundMaterial: process.platform === 'win32' ? 'acrylic' : 'none',
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    visualEffectState: process.platform === 'darwin' ? 'active' : undefined,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  dockWindow(mainWindow)
  mainWindow.on('resize', () => mainWindow && dockWindow(mainWindow))
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
      rebuildTrayMenu()
    }
  })
  mainWindow.on('show', rebuildTrayMenu)
  mainWindow.on('hide', rebuildTrayMenu)
  mainWindow.on('closed', () => {
    mainWindow = undefined
  })

  if (process.env.ELECTRON_RENDERER_URL) void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

function registerTodoHandlers(todoRepository: TodoRepository): void {
  ipcMain.handle('todos:list', () => todoRepository.list())
  ipcMain.handle('todos:create', (_event, title: unknown) => {
    if (typeof title !== 'string') throw new Error('Invalid todo title')
    return todoRepository.create(title)
  })
  ipcMain.handle('todos:update', (_event, id: unknown, changes: unknown) => {
    if (typeof id !== 'string' || !isTodoUpdate(changes)) throw new Error('Invalid todo update')
    return todoRepository.update(id, changes)
  })
  ipcMain.handle('todos:remove', (_event, id: unknown) => {
    if (typeof id !== 'string') throw new Error('Invalid todo id')
    todoRepository.remove(id)
  })
}

function registerWindowHandlers(): void {
  ipcMain.handle('window:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.hide())
  ipcMain.handle('window:toggle-side', () => {
    setDockSide(settings.dockSide === 'left' ? 'right' : 'left')
    return settings.dockSide
  })
  ipcMain.handle('shortcut:get', () => settings.shortcut)
  ipcMain.handle('shortcut:set', (_event, accelerator: unknown) => {
    if (typeof accelerator !== 'string' || accelerator.length > 80) throw new Error('Invalid shortcut')
    const previous = settings.shortcut
    if (!registerAppShortcut(accelerator)) {
      registerAppShortcut(previous)
      throw new Error('Shortcut is already in use')
    }
    settings.shortcut = accelerator
    saveSettings()
    return settings.shortcut
  })
  ipcMain.handle('locale:get', () => settings.language)
  ipcMain.handle('locale:set', (_event, language: unknown) => {
    if (!['system', 'zh-CN', 'en'].includes(String(language))) throw new Error('Invalid language')
    settings.language = language as LanguagePreference
    saveSettings()
    rebuildTrayMenu()
    return settings.language
  })
}

function isTodoUpdate(value: unknown): value is TodoUpdate {
  if (!value || typeof value !== 'object') return false
  const update = value as Record<string, unknown>
  const keys = Object.keys(update)
  return keys.length > 0 && keys.every((key) => key === 'title' || key === 'completed') &&
    (update.title === undefined || typeof update.title === 'string') &&
    (update.completed === undefined || typeof update.completed === 'boolean')
}

app.whenReady().then(() => {
  settings = loadSettings()
  repository = new TodoRepository(join(app.getPath('userData'), 'backlog.db'))
  registerTodoHandlers(repository)
  registerWindowHandlers()
  createWindow()
  createTray()
  if (!registerAppShortcut(settings.shortcut)) {
    settings.shortcut = DEFAULT_SHORTCUT
    registerAppShortcut(settings.shortcut)
    saveSettings()
  }
  screen.on('display-metrics-changed', () => mainWindow && dockWindow(mainWindow))
  screen.on('display-removed', () => mainWindow && dockWindow(mainWindow))
  app.on('activate', () => (mainWindow ? showWindow() : createWindow()))
})

app.on('window-all-closed', () => undefined)
app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('before-quit', () => {
  isQuitting = true
  repository?.close()
  repository = undefined
})
