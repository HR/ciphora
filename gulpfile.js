const spawn = require('child_process').spawn
const { watch } = require('gulp')
var p

const SRC_FILES = [
  './src/main/*.js',
  './src/main/windows/*.js',
  './src/main/lib/*.js'
]
const ELECTRON = __dirname + '/node_modules/.bin/electron'
const DEBUG = false
let args = ['.']
// Start the electron process.
async function electron () {
  // kill previous spawned process
  if (p) {
    p.kill()
  }

  if (DEBUG) args.unshift('--inspect=5858')
  // `spawn` a child `gulp` process linked to the parent `stdio`
  p = await spawn(ELECTRON, args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      DEBUG: 'simple-peer'
    }
  })
}

exports.default = () => {
  watch(
    SRC_FILES,
    {
      queue: false,
      ignoreInitial: false // Execute task on startup
    },
    electron
  )
}
