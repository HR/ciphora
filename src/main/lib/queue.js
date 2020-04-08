'use strict'
/**
 * Queue class
 * Task queue
 */
const EventEmitter = require('events')

module.exports = class Queue extends EventEmitter {
  constructor (timeout) {
    // Call EventEmitter constructor
    super()

    this._queue = []
    this._pendingCount = 0
    this._processing = -1
    this._timeout = timeout
    // this._responseTimeout = responseTimeout
    this._idle = true
  }

  // Process next
  async _next () {
    // Finished
    if (!this._pendingCount) return (this._idle = true)
    this._idle = false
    console.log(this._queue, this._processing, this._pendingCount)
    this._pendingCount--
    if (this._processing > 0) {
      const { removeWhenDone } = this._queue[this._processing]
      if (removeWhenDone) this._remove(this._processing)
    }
    this._queue[++this._processing].run()
  }

  _error (id, error) {
    this.emit('error', id, error)
  }

  _remove (index) {
    // clearTimeout(this._queue[index].timer)
    return delete this._queue[index]
  }

  // Remove task by id
  remove (id) {
    const index = this._queue.findIndex(task => task.id === id)
    if (index < 0) return false
    return this._remove(index)
  }

  // Add task by id
  // TODO: Add timeout interval for task hangup
  add (fn, id) {
    let removeWhenDone = false
    if (!id) {
      // If an id not passed then remove when done
      removeWhenDone = true
    }
    let timer
    const run = async () => {
      console.log('Running task', id)

      try {
        // const promise = fn.apply(null, args)
        await fn()
        // Set timeout for response
        // timer = setTimeout(() => {
        //   throw new Error('Timeout')
        // }, this._timeout)
        console.log('Finished task', id)
      } catch (error) {
        this._error(id, error)
      }

      this._next()
    }

    this._queue.push({ id, run, timer, removeWhenDone })
    this._pendingCount++

    if (this._idle) {
      // Start processing
      console.log('Idle, start', id)
      this._next()
    }
  }
}
