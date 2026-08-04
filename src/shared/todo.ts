export interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface TodoUpdate {
  title?: string
  completed?: boolean
}

export interface TodoApi {
  list(): Promise<Todo[]>
  create(title: string): Promise<Todo>
  update(id: string, changes: TodoUpdate): Promise<Todo>
  remove(id: string): Promise<void>
}

export interface WindowApi {
  minimize(): Promise<void>
  toggleSide(): Promise<'left' | 'right'>
  close(): Promise<void>
}

export interface ShortcutApi {
  get(): Promise<string>
  set(accelerator: string): Promise<string>
}
