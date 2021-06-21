'use strict'

const main = (module.exports = {
  init,
  secondInstance,
  activate,
  send,
  win: null
})
const { app, BrowserWindow } = require('electron'),
  { waitUntil } = require('../lib/util'),
  { LOAD_URL, MAIN_WIN_WIDTH, MAIN_WIN_HEIGHT } = require('../../config')

// Create and initializes a new main window
async function init () {
  let isWindowReady = false
  const win = (main.win = new BrowserWindow({
    title: app.name,
    show: false,
    width: MAIN_WIN_WIDTH,
    height: MAIN_WIN_HEIGHT,
    minWidth: 700,
    minHeight: 400,
    // backgroundColor: '#00FFFFFF',
    frame: false,
    // vibrancy: 'appearance-based',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // To allow local image loading
      allowRunningInsecureContent: true
    }
  }))

  win.on('ready-to-show', () => {
    isWindowReady = true
    win.show()
  })

  win.on('closed', () => {
    // Dereference the window
    // For multiple windows store them in an array
    main.win = undefined
  })

  await win.loadURL(LOAD_URL)
  // Wait until window has loaded
  await waitUntil(() => isWindowReady, 6000)
  return win
}

// Handles second instance of window
function secondInstance () {
  if (main.win) {
    // Show existing window if it already exists
    if (main.win.isMinimized()) {
      main.win.restore()
    }

    main.win.show()
  }
}

// Activates the window
function activate () {
  if (!main.win) {
    // Create the main window if it doesn't exist already
    main.win = init()
  }
}

// Sends an IPC message to the renderer (the window)
function send (channel, ...args) {
  if (main.win) {
    main.win.webContents.send(channel, ...args)
  }
}
