const spawn = require('child_process')
  .spawn;
const { watch, series } = require('gulp');
var p;

const SRC_FILES = ['src/**/*.js', '!src/renderer/**/*.js']
const ELECTRON = __dirname + '/node_modules/.bin/electron'
const DEBUG = false
let args = ['.']
// Start the electron process.
async function electron() {
  // kill previous spawned process
  if (p) { p.kill(); }

  if (DEBUG) args.unshift('--inspect=5858')
  // `spawn` a child `gulp` process linked to the parent `stdio`
  p = await spawn(ELECTRON, args, { stdio: 'inherit' });
}


exports.default = () => {
  watch(SRC_FILES, {
    queue: false,
    ignoreInitial: false // Execute task on startup
  }, electron);
};