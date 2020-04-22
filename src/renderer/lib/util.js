// Makes PGP error messages user friendly
export function friendlyError (error) {
  return error.message.slice(
    error.message.lastIndexOf('Error'),
    error.message.length
  )
}
// Makes a deep clone of an object
export function clone (obj) {
  return JSON.parse(JSON.stringify(obj))
}

// Generates a hash code for a string
export function hashCode (string) {
  for (var i = 0, h = 0; i < string.length; i++)
    h = (Math.imul(31, h) + string.charCodeAt(i)) | 0
  return h
}

// Returns the initials of a name
export function initialsise (name) {
  let iname = name.toUpperCase().split(' ')
  let initials = name[0]
  if (iname.length > 1) {
    initials += iname[iname.length - 1][0]
  }
  return initials
}

// Turns an object into a react clasaName compatible list
export function classList (classes) {
  if (!Array.isArray(classes)) {
    // Turn into an array if not already
    classes = Object.entries(classes)
      .filter(entry => entry[1])
      .map(entry => entry[0])
  }
  return classes.join(' ')
}

// Checks if an object is empty
export function isEmpty (obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object
}
