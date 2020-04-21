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
      nodeIntegration: true,
      webSecurity: false
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

  console.log(LOAD_URL)

  await win.loadURL(LOAD_URL)
  // Wait until window has loaded
  await waitUntil(() => isWindowReady, 6000)
  return win
}

function secondInstance () {
  if (main.win) {
    if (main.win.isMinimized()) {
      main.win.restore()
    }

    main.win.show()
  }
}

function activate () {
  if (!main.win) {
    main.win = init()
  }
}

function send (channel, ...args) {
  if (main.win) {
    main.win.webContents.send(channel, ...args)
  }
}
