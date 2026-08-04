<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeftRight, Check, ChevronDown, Keyboard, Minus, Pencil, Plus, Settings, Trash2, X } from 'lucide-vue-next'
import type { ComponentPublicInstance } from 'vue'
import type { LanguagePreference, Todo } from '../../shared/todo'

type TodoTab = 'active' | 'completed'
type CopyKey = keyof typeof copy.zh

const copy = {
  zh: {
    title: '待办事项', addPlaceholder: '添加待办事项…', enter: 'Enter', active: '未完成', completed: '已完成',
    today: '今天', yesterday: '昨天', emptyActive: '当前没有待办', emptyCompleted: '还没有已完成任务',
    loading: '正在读取本地数据…', settings: '设置', language: '语言', system: '跟随系统', chinese: '中文',
    english: 'English', shortcut: '全局快捷键', shortcutHint: '在任何位置按下快捷键显示或隐藏 Backlog',
    record: '请按下新的快捷键…', remaining: '项待办', clearCompleted: '清除已完成', invalidShortcut: '快捷键至少需要 Ctrl、Cmd 或 Alt 修饰键',
    operationFailed: '操作失败，请重试', dock: '切换停靠侧', minimize: '隐藏', edit: '编辑', remove: '删除',
    markDone: '标记为已完成', markActive: '标记为未完成'
  },
  en: {
    title: 'Todos', addPlaceholder: 'Add a todo…', enter: 'Enter', active: 'Unfinished', completed: 'Completed',
    today: 'Today', yesterday: 'Yesterday', emptyActive: 'Nothing to do', emptyCompleted: 'No completed tasks yet',
    loading: 'Loading local data…', settings: 'Settings', language: 'Language', system: 'System', chinese: '中文',
    english: 'English', shortcut: 'Global Shortcut', shortcutHint: 'Show or hide Backlog from anywhere',
    record: 'Press a new shortcut…', remaining: 'todos', clearCompleted: 'Clear Completed', invalidShortcut: 'Use Ctrl, Cmd, or Alt in the shortcut',
    operationFailed: 'Something went wrong', dock: 'Switch dock side', minimize: 'Hide', edit: 'Edit', remove: 'Delete',
    markDone: 'Mark completed', markActive: 'Mark unfinished'
  }
} as const

const todos = ref<Todo[]>([])
const activeTab = ref<TodoTab>('active')
const newTitle = ref('')
const editingId = ref<string | null>(null)
const editingTitle = ref('')
const editInputs = new Map<string, HTMLInputElement>()
const error = ref('')
const loading = ref(true)
const settingsOpen = ref(false)
const shortcut = ref('CommandOrControl+Shift+/')
const recordingShortcut = ref(false)
const language = ref<LanguagePreference>('system')
const windowControls = window.windowControls
let removeOpenSettingsListener: (() => void) | undefined

const activeCount = computed(() => todos.value.filter((todo) => !todo.completed).length)
const completedCount = computed(() => todos.value.length - activeCount.value)
const visibleTodos = computed(() => todos.value.filter((todo) => activeTab.value === 'active' ? !todo.completed : todo.completed))
const visibleGroups = computed(() => groupByDate(visibleTodos.value))
const effectiveLanguage = computed<'zh' | 'en'>(() =>
  language.value === 'zh-CN' || (language.value === 'system' && navigator.language.toLowerCase().startsWith('zh')) ? 'zh' : 'en'
)
const shortcutLabel = computed(() => shortcut.value.replace('CommandOrControl', navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl').replaceAll('+', ' + '))

function t(key: CopyKey): string {
  return copy[effectiveLanguage.value][key]
}

onMounted(async () => {
  removeOpenSettingsListener = windowControls.onOpenSettings(() => { settingsOpen.value = true })
  try {
    const [savedTodos, savedShortcut, savedLanguage] = await Promise.all([window.todos.list(), window.shortcut.get(), window.locale.get()])
    todos.value = savedTodos
    shortcut.value = savedShortcut
    language.value = savedLanguage
  } catch (cause) {
    showError(cause)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => removeOpenSettingsListener?.())

async function setLanguage(nextLanguage: LanguagePreference): Promise<void> {
  try {
    language.value = await window.locale.set(nextLanguage)
  } catch (cause) {
    showError(cause)
  }
}

async function addTodo(): Promise<void> {
  if (!newTitle.value.trim()) return
  try {
    todos.value.unshift(await window.todos.create(newTitle.value))
    newTitle.value = ''
    activeTab.value = 'active'
    error.value = ''
  } catch (cause) { showError(cause) }
}

async function toggleTodo(todo: Todo): Promise<void> {
  try { replaceTodo(await window.todos.update(todo.id, { completed: !todo.completed })) }
  catch (cause) { showError(cause) }
}

async function beginEdit(todo: Todo): Promise<void> {
  editingId.value = todo.id
  editingTitle.value = todo.title
  await nextTick()
  editInputs.get(todo.id)?.focus()
  editInputs.get(todo.id)?.select()
}

function setEditInput(id: string, element: Element | ComponentPublicInstance | null): void {
  if (element instanceof HTMLInputElement) editInputs.set(id, element)
  else editInputs.delete(id)
}

async function saveEdit(todo: Todo): Promise<void> {
  if (editingId.value !== todo.id) return
  const title = editingTitle.value.trim()
  if (!title) { editingId.value = null; return }
  try { replaceTodo(await window.todos.update(todo.id, { title })); editingId.value = null }
  catch (cause) { showError(cause) }
}

async function removeTodo(todo: Todo): Promise<void> {
  try { await window.todos.remove(todo.id); todos.value = todos.value.filter((item) => item.id !== todo.id) }
  catch (cause) { showError(cause) }
}

async function clearCompleted(): Promise<void> {
  try {
    await Promise.all(todos.value.filter((todo) => todo.completed).map((todo) => window.todos.remove(todo.id)))
    todos.value = todos.value.filter((todo) => !todo.completed)
  } catch (cause) { showError(cause) }
}

async function recordShortcut(event: KeyboardEvent): Promise<void> {
  event.preventDefault()
  const accelerator = acceleratorFromEvent(event)
  if (!accelerator) return
  try { shortcut.value = await window.shortcut.set(accelerator); recordingShortcut.value = false; error.value = '' }
  catch (cause) { showError(cause) }
}

function acceleratorFromEvent(event: KeyboardEvent): string | null {
  if (['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) return null
  const modifiers: string[] = []
  if (event.ctrlKey || event.metaKey) modifiers.push('CommandOrControl')
  if (event.altKey) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')
  if (modifiers.length === 0) { error.value = t('invalidShortcut'); return null }
  const key = event.key === '?' ? '/' : event.key.length === 1 ? event.key.toUpperCase() : event.key
  return [...modifiers, key].join('+')
}

function replaceTodo(updated: Todo): void {
  todos.value = todos.value.map((todo) => todo.id === updated.id ? updated : todo)
}

function showError(cause: unknown): void {
  error.value = cause instanceof Error ? cause.message : t('operationFailed')
}

function groupByDate(items: Todo[]): Array<{ key: string; label: string; count: number; items: Todo[] }> {
  const groups = new Map<string, Todo[]>()
  for (const todo of [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const key = localDateKey(new Date(todo.createdAt))
    groups.set(key, [...(groups.get(key) ?? []), todo])
  }
  return [...groups.entries()].map(([key, groupedItems]) => ({ key, label: dateLabel(key), count: groupedItems.length, items: groupedItems }))
}

function dateLabel(key: string): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const date = new Date(`${key}T00:00:00`)
  const suffix = new Intl.DateTimeFormat(effectiveLanguage.value === 'zh' ? 'zh-CN' : 'en', { month: 'short', day: 'numeric' }).format(date)
  if (key === localDateKey(today)) return `${t('today')}  ${suffix}`
  if (key === localDateKey(yesterday)) return `${t('yesterday')}  ${suffix}`
  return suffix
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function timeLabel(value: string): string {
  return new Intl.DateTimeFormat(effectiveLanguage.value === 'zh' ? 'zh-CN' : 'en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}
</script>

<template>
  <main class="app-shell">
    <header class="titlebar">
      <div class="brand"><img src="/backlog.png" alt="" /><strong>Backlog</strong></div>
      <div class="window-actions">
        <button type="button" :title="t('dock')" :aria-label="t('dock')" @click="windowControls.toggleSide"><ArrowLeftRight :size="17" /></button>
        <button type="button" :title="t('settings')" :aria-label="t('settings')" @click="settingsOpen = true"><Settings :size="18" /></button>
        <button type="button" :title="t('minimize')" :aria-label="t('minimize')" @click="windowControls.minimize"><Minus :size="18" /></button>
      </div>
    </header>

    <section class="workspace">
      <h1>{{ t('title') }}</h1>
      <form class="composer" @submit.prevent="addTodo">
        <Plus :size="20" />
        <input v-model="newTitle" maxlength="240" :placeholder="t('addPlaceholder')" :aria-label="t('addPlaceholder')" />
        <span>{{ t('enter') }}</span>
      </form>

      <div class="tabs" role="tablist">
        <button :class="{ active: activeTab === 'active' }" type="button" role="tab" @click="activeTab = 'active'">{{ t('active') }} <b>{{ activeCount }}</b></button>
        <button :class="{ active: activeTab === 'completed' }" type="button" role="tab" @click="activeTab = 'completed'">{{ t('completed') }} <b>{{ completedCount }}</b></button>
      </div>

      <p v-if="error" class="error-message" role="alert">{{ error }}</p>
      <div v-if="loading" class="empty-state">{{ t('loading') }}</div>
      <div v-else-if="visibleGroups.length === 0" class="empty-state"><Check :size="28" /><span>{{ activeTab === 'active' ? t('emptyActive') : t('emptyCompleted') }}</span></div>
      <div v-else class="todo-groups">
        <section v-for="group in visibleGroups" :key="group.key" class="date-group">
          <header><h2>{{ group.label }}</h2><ChevronDown :size="14" /><span>{{ group.count }}</span></header>
          <ul>
            <li v-for="todo in group.items" :key="todo.id" :class="{ completed: todo.completed }">
              <button class="check-button" type="button" :aria-label="todo.completed ? t('markActive') : t('markDone')" @click="toggleTodo(todo)"><Check v-if="todo.completed" :size="13" /></button>
              <input v-if="editingId === todo.id" :ref="(element) => setEditInput(todo.id, element)" v-model="editingTitle" class="edit-input" maxlength="240" @blur="saveEdit(todo)" @keydown.enter.prevent="saveEdit(todo)" @keydown.escape="editingId = null" />
              <button v-else class="todo-title" type="button" @dblclick="beginEdit(todo)">{{ todo.title }}</button>
              <time>{{ timeLabel(todo.createdAt) }}</time>
              <div class="row-actions">
                <button type="button" :title="t('edit')" :aria-label="t('edit')" @click="beginEdit(todo)"><Pencil :size="14" /></button>
                <button type="button" :title="t('remove')" :aria-label="t('remove')" @click="removeTodo(todo)"><Trash2 :size="14" /></button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </section>

    <footer class="statusbar">
      <span>{{ activeCount }} {{ t('remaining') }}</span>
      <button type="button" :disabled="completedCount === 0" @click="clearCompleted">{{ t('clearCompleted') }} <Trash2 :size="14" /></button>
    </footer>

    <div v-if="settingsOpen" class="modal-backdrop" @click.self="settingsOpen = false">
      <section class="settings-dialog" role="dialog" aria-modal="true">
        <header><h2>{{ t('settings') }}</h2><button type="button" aria-label="Close" @click="settingsOpen = false"><X :size="16" /></button></header>
        <label>{{ t('language') }}</label>
        <div class="language-control">
          <button v-for="option in ([['system', 'system'], ['zh-CN', 'chinese'], ['en', 'english']] as const)" :key="option[0]" :class="{ active: language === option[0] }" type="button" @click="setLanguage(option[0])">{{ t(option[1]) }}</button>
        </div>
        <label>{{ t('shortcut') }}</label>
        <button class="shortcut-recorder" :class="{ recording: recordingShortcut }" type="button" @click="recordingShortcut = true" @keydown="recordShortcut"><Keyboard :size="16" />{{ recordingShortcut ? t('record') : shortcutLabel }}</button>
        <p>{{ t('shortcutHint') }}</p>
      </section>
    </div>
  </main>
</template>
