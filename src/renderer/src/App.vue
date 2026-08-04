<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  ArrowLeftRight,
  Check,
  CheckSquare,
  Keyboard,
  Minus,
  Pencil,
  Plus,
  Settings,
  Trash2,
  X
} from 'lucide-vue-next'
import type { ComponentPublicInstance } from 'vue'
import type { Todo } from '../../shared/todo'

type TodoTab = 'active' | 'completed'

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
const windowControls = window.windowControls

const activeCount = computed(() => todos.value.filter((todo) => !todo.completed).length)
const completedCount = computed(() => todos.value.length - activeCount.value)
const visibleTodos = computed(() =>
  todos.value.filter((todo) => (activeTab.value === 'active' ? !todo.completed : todo.completed))
)
const visibleGroups = computed(() => groupByDate(visibleTodos.value))
const shortcutLabel = computed(() =>
  shortcut.value
    .replace('CommandOrControl', navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl')
    .replaceAll('+', ' + ')
)

onMounted(async () => {
  try {
    const [savedTodos, savedShortcut] = await Promise.all([window.todos.list(), window.shortcut.get()])
    todos.value = savedTodos
    shortcut.value = savedShortcut
  } catch (cause) {
    showError(cause)
  } finally {
    loading.value = false
  }
})

async function addTodo(): Promise<void> {
  if (!newTitle.value.trim()) return
  try {
    const todo = await window.todos.create(newTitle.value)
    todos.value.unshift(todo)
    newTitle.value = ''
    activeTab.value = 'active'
    error.value = ''
  } catch (cause) {
    showError(cause)
  }
}

async function toggleTodo(todo: Todo): Promise<void> {
  try {
    replaceTodo(await window.todos.update(todo.id, { completed: !todo.completed }))
  } catch (cause) {
    showError(cause)
  }
}

async function beginEdit(todo: Todo): Promise<void> {
  editingId.value = todo.id
  editingTitle.value = todo.title
  await nextTick()
  const input = editInputs.get(todo.id)
  input?.focus()
  input?.select()
}

function setEditInput(id: string, element: Element | ComponentPublicInstance | null): void {
  if (element instanceof HTMLInputElement) editInputs.set(id, element)
  else editInputs.delete(id)
}

async function saveEdit(todo: Todo): Promise<void> {
  if (editingId.value !== todo.id) return
  const title = editingTitle.value.trim()
  if (!title) {
    editingId.value = null
    return
  }
  try {
    replaceTodo(await window.todos.update(todo.id, { title }))
    editingId.value = null
  } catch (cause) {
    showError(cause)
  }
}

async function removeTodo(todo: Todo): Promise<void> {
  try {
    await window.todos.remove(todo.id)
    todos.value = todos.value.filter((item) => item.id !== todo.id)
  } catch (cause) {
    showError(cause)
  }
}

async function recordShortcut(event: KeyboardEvent): Promise<void> {
  event.preventDefault()
  event.stopPropagation()
  const accelerator = acceleratorFromEvent(event)
  if (!accelerator) return
  try {
    shortcut.value = await window.shortcut.set(accelerator)
    recordingShortcut.value = false
    error.value = ''
  } catch (cause) {
    showError(cause)
  }
}

function acceleratorFromEvent(event: KeyboardEvent): string | null {
  if (['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) return null
  const modifiers: string[] = []
  if (event.ctrlKey || event.metaKey) modifiers.push('CommandOrControl')
  if (event.altKey) modifiers.push('Alt')
  if (event.shiftKey) modifiers.push('Shift')
  if (modifiers.length === 0) {
    error.value = '快捷键至少需要 Ctrl、Cmd 或 Alt 修饰键'
    return null
  }
  const key = event.key === '?' ? '/' : event.key.length === 1 ? event.key.toUpperCase() : event.key
  return [...modifiers, key].join('+')
}

function replaceTodo(updated: Todo): void {
  todos.value = todos.value.map((todo) => (todo.id === updated.id ? updated : todo))
}

function showError(cause: unknown): void {
  error.value = cause instanceof Error ? cause.message : '操作失败，请重试'
}

function groupByDate(items: Todo[]): Array<{ key: string; label: string; items: Todo[] }> {
  const groups = new Map<string, Todo[]>()
  const sorted = [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  for (const todo of sorted) {
    const key = localDateKey(new Date(todo.createdAt))
    groups.set(key, [...(groups.get(key) ?? []), todo])
  }
  return [...groups.entries()].map(([key, groupedItems]) => ({ key, label: dateLabel(key), items: groupedItems }))
}

function dateLabel(key: string): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (key === localDateKey(today)) return '今天'
  if (key === localDateKey(yesterday)) return '昨天'
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(`${key}T00:00:00`))
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
</script>

<template>
  <main class="app-shell">
    <header class="titlebar">
      <div class="titlebar-brand">
        <img src="/backlog.png" alt="" />
        <span>Backlog</span>
      </div>
      <div class="window-actions">
        <button type="button" title="切换停靠侧" aria-label="切换停靠侧" @click="windowControls.toggleSide">
          <ArrowLeftRight :size="14" />
        </button>
        <button type="button" title="快捷键设置" aria-label="快捷键设置" @click="settingsOpen = true">
          <Settings :size="14" />
        </button>
        <button type="button" title="最小化" aria-label="最小化" @click="windowControls.minimize"><Minus :size="15" /></button>
        <button class="close-button" type="button" title="关闭" aria-label="关闭" @click="windowControls.close"><X :size="15" /></button>
      </div>
    </header>

    <section class="workspace">
      <header class="page-header">
        <div class="heading-row"><CheckSquare :size="18" /><h1>待办</h1></div>
      </header>

      <form class="composer" @submit.prevent="addTodo">
        <Plus :size="14" aria-hidden="true" />
        <input v-model="newTitle" aria-label="新待办标题" maxlength="240" placeholder="添加一个待办…" />
        <button type="submit" :disabled="!newTitle.trim()">添加</button>
      </form>

      <p v-if="error" class="error-message" role="alert">{{ error }}</p>

      <div class="tabs" role="tablist" aria-label="待办状态">
        <button :class="{ active: activeTab === 'active' }" type="button" role="tab" @click="activeTab = 'active'">
          未完成 <span>{{ activeCount }}</span>
        </button>
        <button :class="{ active: activeTab === 'completed' }" type="button" role="tab" @click="activeTab = 'completed'">
          已完成 <span>{{ completedCount }}</span>
        </button>
      </div>

      <div v-if="loading" class="empty-state">正在读取本地数据…</div>
      <div v-else-if="visibleGroups.length === 0" class="empty-state">
        <Check :size="28" />
        <h2>{{ activeTab === 'active' ? '当前没有待办' : '还没有已完成任务' }}</h2>
      </div>
      <div v-else class="todo-groups">
        <section v-for="group in visibleGroups" :key="group.key" class="date-group">
          <h2>{{ group.label }}</h2>
          <ul class="todo-list">
            <li v-for="todo in group.items" :key="todo.id" :class="{ completed: todo.completed }">
              <button class="check-button" type="button" :aria-label="todo.completed ? '标记为未完成' : '标记为已完成'" @click="toggleTodo(todo)">
                <Check v-if="todo.completed" :size="13" />
              </button>
              <input
                v-if="editingId === todo.id"
                :ref="(element) => setEditInput(todo.id, element)"
                v-model="editingTitle"
                class="edit-input"
                maxlength="240"
                aria-label="编辑待办标题"
                @blur="saveEdit(todo)"
                @keydown.enter.prevent="saveEdit(todo)"
                @keydown.escape="editingId = null"
              />
              <button v-else class="todo-title" type="button" @dblclick="beginEdit(todo)">{{ todo.title }}</button>
              <button class="icon-button" type="button" title="编辑" aria-label="编辑" @click="beginEdit(todo)"><Pencil :size="15" /></button>
              <button class="icon-button danger" type="button" title="删除" aria-label="删除" @click="removeTodo(todo)"><Trash2 :size="15" /></button>
            </li>
          </ul>
        </section>
      </div>
    </section>

    <div v-if="settingsOpen" class="modal-backdrop" @click.self="settingsOpen = false">
      <section class="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header><div><Keyboard :size="17" /><h2 id="settings-title">快捷键</h2></div><button type="button" aria-label="关闭设置" @click="settingsOpen = false"><X :size="15" /></button></header>
        <p>用于在任何应用中呼出或隐藏 Backlog。</p>
        <button class="shortcut-recorder" :class="{ recording: recordingShortcut }" type="button" @click="recordingShortcut = true" @keydown="recordShortcut">
          {{ recordingShortcut ? '请按下新的快捷键…' : shortcutLabel }}
        </button>
      </section>
    </div>
  </main>
</template>
