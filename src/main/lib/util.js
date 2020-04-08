'use strict'

module.exports = {
  waitUntil,
  parseAddress,
  isEmpty,
  chunk,
  hexToUint8,
  isString
}

// Wait until a condition is true
function waitUntil (conditionFn, timeout, pollInterval = 30) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    ;(function wait () {
      if (conditionFn()) return resolve()
      else if (timeout && Date.now() - start >= timeout)
        return reject(new Error(`Timeout ${timeout} for waitUntil exceeded`))
      else setTimeout(wait, pollInterval)
    })()
  })
}

// Parses name/email address of format '[name] <[email]>'
function parseAddress (address) {
  // Check if unknown
  address = address && address.length ? address[0] : 'Unknown'
  // Check if it has an email as well (follows the format)
  if (!address.includes('<')) {
    return { name: address }
  }

  let [name, email] = address.split('<').map(n => n.trim().replace(/>/g, ''))
  return { name, email }
}

// Checks if an object is empty
function isEmpty (obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object
}

// Splits a buffer into chunks of a given size
function chunk (buffer, chunkSize) {
  if (!Buffer.isBuffer(buffer)) throw new Error('Buffer is required')

  let result = [],
    i = 0,
    len = buffer.length

  while (i < len) {
    // If it does not equally divide then set last to whatever remains
    result.push(buffer.slice(i, Math.min((i += chunkSize), len)))
  }

  return result
}

// Converts a hex string into a Uint8Array
function hexToUint8 (hex) {
  return Uint8Array.from(Buffer.from(hex, 'hex'))
}

// Checks if the given object is a string
function isString (obj) {
  return typeof obj === 'string' || obj instanceof String
}
