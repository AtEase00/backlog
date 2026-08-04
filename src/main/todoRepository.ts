import { randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import type { Todo, TodoUpdate } from '../shared/todo'

interface TodoRow {
  id: string
  title: string
  completed: number
  created_at: string
  updated_at: string
}

function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export class TodoRepository {
  private readonly db: DatabaseSync

  constructor(databasePath: string) {
    this.db = new DatabaseSync(databasePath)
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL CHECK(length(trim(title)) > 0),
        completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)
  }

  list(): Todo[] {
    const rows = this.db
      .prepare('SELECT * FROM todos ORDER BY completed ASC, created_at DESC')
      .all() as unknown as TodoRow[]
    return rows.map(toTodo)
  }

  create(title: string): Todo {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) throw new Error('待办标题不能为空')

    const now = new Date().toISOString()
    const todo: Todo = {
      id: randomUUID(),
      title: normalizedTitle,
      completed: false,
      createdAt: now,
      updatedAt: now
    }

    this.db
      .prepare(
        'INSERT INTO todos (id, title, completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(todo.id, todo.title, 0, todo.createdAt, todo.updatedAt)
    return todo
  }

  update(id: string, changes: TodoUpdate): Todo {
    const current = this.find(id)
    const title = changes.title === undefined ? current.title : changes.title.trim()
    if (!title) throw new Error('待办标题不能为空')

    const completed = changes.completed ?? current.completed
    const updatedAt = new Date().toISOString()
    this.db
      .prepare('UPDATE todos SET title = ?, completed = ?, updated_at = ? WHERE id = ?')
      .run(title, completed ? 1 : 0, updatedAt, id)
    return { ...current, title, completed, updatedAt }
  }

  remove(id: string): void {
    const result = this.db.prepare('DELETE FROM todos WHERE id = ?').run(id)
    if (result.changes === 0) throw new Error('待办不存在')
  }

  close(): void {
    this.db.close()
  }

  private find(id: string): Todo {
    const row = this.db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as TodoRow | undefined
    if (!row) throw new Error('待办不存在')
    return toTodo(row)
  }
}
