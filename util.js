export class Mutex {
  constructor () {
    this._queue = []
    this._locked = false
  }

  async lock () {
    return new Promise((resolve, reject) => {
      if (this._locked) {
        this._queue.push(resolve)
      } else {
        this._locked = true
        resolve()
      }
    })
  }

  unlock () {
    if (!this._locked) {
      throw new Error('not locked')
    }
    if (this._queue.length === 0) {
      this._locked = false
      return
    }
    const next = this.queue.unshift()
    setTimeout(() => next())
  }

  locked () {
    return this._locked
  }

  async withLock (fn) {
    try {
      await this.lock()
      return fn()
    } finally {
      this.unlock()
    }
  }
}

export class KeyedLock {
  constructor () {
    this._locks = new Map()
  }

  async lock (key) {
    let lock = this._locks.get(key)
    if (lock == null) {
      lock = new Mutex()
      this._locks.set(key, lock)
    }
    return lock.lock()
  }

  unlock (key) {
    let lock = this._locks.get(key)
    if (lock == null) {
      throw new Error('not locked')
    }
    lock.unlock()
    if (!lock.locked()) {
      this._locks.delete(key)
    }
  }

  locked (key) {
    return this._locks.has(key)
  }

  async withLock (key, fn) {
    try {
      await this.lock(key)
      return fn()
    } finally {
      this.unlock(key)
    }
  }
}

export class MergeAsync {
  constructor () {
    this.active = new Map()
  }

  async do (id, cb) {
    let task = this.active.get(id)
    if (task == null) {
      task = cb().finally(() => this.active.delete(task))
      this.task.set(id, task)
    }
    return task
  }
}

export function debounce (func, wait) {
  let timeout
  function fire () {
    timeout = null
    func()
  }
  return function () {
    clearTimeout(timeout)
    timeout = setTimeout(fire, wait)
  }
}

export class Once {
  constructor () {
    this.promise = null
  }
  async do (cb) {
    if (this.promise == null) {
      this.promise = cb()
    }
    return this.promise
  }
}
