import { afterEach, describe, expect, it } from 'vitest'
import { TodoRepository } from '../src/main/todoRepository'

let repository: TodoRepository | undefined

afterEach(() => {
  repository?.close()
  repository = undefined
})

describe('TodoRepository', () => {
  it('creates, updates, lists and removes a todo', () => {
    repository = new TodoRepository(':memory:')

    const created = repository.create('  编写第一条待办  ')
    expect(created.title).toBe('编写第一条待办')
    expect(repository.list()).toEqual([created])

    const completed = repository.update(created.id, { completed: true })
    expect(completed.completed).toBe(true)
    expect(repository.list()[0]?.completed).toBe(true)

    repository.remove(created.id)
    expect(repository.list()).toEqual([])
  })

  it('rejects blank titles and unknown todos', () => {
    repository = new TodoRepository(':memory:')

    expect(() => repository?.create('   ')).toThrow('待办标题不能为空')
    expect(() => repository?.update('missing', { completed: true })).toThrow('待办不存在')
    expect(() => repository?.remove('missing')).toThrow('待办不存在')
  })
})
