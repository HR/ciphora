'use strict'

const { app, Menu, ipcMain, clipboard } = require('electron'),
  { basename } = require('path'),
  { is } = require('electron-util'),
  unhandled = require('electron-unhandled'),
  debug = require('electron-debug'),
  contextMenu = require('electron-context-menu'),
  leveldown = require('leveldown'),
  levelup = require('levelup'),
  encode = require('encoding-down'),
  packageJson = require('../../package.json'),
  Crypto = require('./lib/crypto'),
  Signal = require('./lib/signal'),
  Peers = require('./lib/peers'),
  Chats = require('./lib/chats'),
  State = require('./lib/state'),
  { CONTENT_TYPES } = require('../consts'),
  menu = require('./menu'),
  ipc = require('./ipc'),
  windows = require('./windows'),
  { DB_PATH } = require('../config')

unhandled()
debug()
contextMenu()

app.setAppUserModelId(packageJson.build.appId)
ipc.init()
let dbPath = DB_PATH

if (!is.development) {
  // Prevent multiple instances of the app
  if (!app.requestSingleInstanceLock()) {
    app.quit()
  }

  // Someone tried to run a second instance, so focus the main window
  app.on('second-instance', windows.main.secondInstance)
} else {
  // Allow multiple instances of the app in dev
  if (!app.requestSingleInstanceLock()) {
    console.log('Second instance')
    dbPath += '2'
  }
}

app.on('window-all-closed', () => {
  if (!is.macos) {
    app.quit()
  }
})

app.on('activate', windows.main.activate)
;(async () => {
  // TODO: Modularise all listeners
  console.log('\n\n\n**********************************************> New run\n')

  await app.whenReady()
  Menu.setApplicationMenu(menu)

  let userId
  const db = await levelup(encode(leveldown(dbPath), { valueEncoding: 'json' }))
  const crypto = new Crypto(db)
  const state = new State(db)
  const chats = new Chats(db)
  const signal = new Signal()
  const peers = new Peers(signal, crypto)

  /**
   * Signal events
   *****************************/
  // When a new chat request is received from a user
  signal.on('chat-request', async ({ senderPublicKey: publicKeyArmored }) => {
    console.log('Chat request received')
    // TODO: Check id against block/removed list and add to chats
    const { id, address } = await crypto.getPublicKeyInfoOf(publicKeyArmored)
    if (!chats.has(id)) {
      // Add chat if not already added
      await chats.add(id, publicKeyArmored, address)
      await crypto.addKey(id, publicKeyArmored)
      windows.main.send('update-chats', chats.getAll(), null)
    }
    // Accept chat request by default
    signal.send('chat-accept', {
      senderPublicKey: crypto.getPublicKey(),
      receiverId: id
    })
    console.log('Chat request accepted')
  })
  // When the chat request is accepted from the user
  signal.on('chat-accept', async ({ senderId, senderPublicKey }) => {
    console.log('Chat request accepted')
    const { address } = await crypto.getPublicKeyInfoOf(senderPublicKey)
    // Add chat
    await chats.add(senderId, senderPublicKey, address)
    await crypto.addKey(senderId, senderPublicKey)
    // Update UI
    windows.main.send('update-chats', chats.getAll(), senderId, true)
    // Establish a connection
    peers.connect(senderId)
  })
  // When the user for a new chat request cannot be found
  signal.on('unknown-receiver', ({ type, receiverId }) => {
    if (type === 'chat-request') {
      windows.main.send(
        'notify',
        'Recipient not on Ciphora or is offline',
        'error',
        true,
        4000
      )
    }
  })

  /**
   * Peers events
   *****************************/
  // When a new connection with a user is established
  peers.on('connect', async userId => {
    console.log('Connected with', userId)
    // Set user as online
    chats.setOnline(userId)
    // Update UI
    windows.main.send('update-chats', chats.getAll())
  })
  // When a connection with a user is closed
  peers.on('disconnect', async userId => {
    console.log('Disconnected with', userId)
    chats.setOffline(userId)
    // Update UI
    windows.main.send('update-chats', chats.getAll())
  })
  // When a connection error with a user occurs
  peers.on('error', (userId, err) => {
    console.log('Error connecting with peer', userId)
    console.error(err)
  })
  // When a new message from a user is received
  peers.on('message', async (senderId, message) => {
    console.log('Got message', message)
    chats.addMessage(senderId, message)
    windows.main.send('update-chats', chats.getAll())
  })

  /**
   * IPC events
   *****************************/
  // When a message is sent by the user
  ipcMain.on(
    'send-message',
    async (event, contentType, content, receiverId) => {
      // Construct message
      let contentPath
      let message = {
        sender: userId,
        content,
        contentType, // mime-type of message
        timestamp: new Date().toISOString()
      }

      // Set the id of the message to its hash
      message.id = crypto.hash(JSON.stringify(message))
      console.log('Adding message', message)
      // TODO: Copy media to media dir
      chats.addMessage(receiverId, { ...message })
      // Optimistically update UI
      windows.main.send('update-chats', chats.getAll())

      if (
        contentType === CONTENT_TYPES.IMAGE ||
        contentType === CONTENT_TYPES.FILE
      ) {
        contentPath = content
        // Set to file name
        message.content = basename(contentPath)
        // Hash content for verification
        message.contentHash = await crypto.hashFile(contentPath)
      }

      peers.sendMessage(message.id, receiverId, message, true, contentPath)
    }
  )
  // When the user adds a new chat with a new recipient
  ipcMain.on('add-chat', async (event, ciphoraId, publicKeyArmored) => {
    if (!ciphoraId) {
      try {
        // Try to get the ciphoraId from public key and address
        const { id } = await crypto.getPublicKeyInfoOf(publicKeyArmored)
        ciphoraId = id
      } catch (err) {
        windows.main.send('notify', 'Invalid PGP key', 'error', true, 4000)
      }
    }
    // Normalise id
    ciphoraId = ciphoraId.toLowerCase()
    // Ensure it hasn't been already added or is own
    if (chats.has(ciphoraId) || ciphoraId === userId) {
      windows.main.send('notify', 'Already added', null, true, 4000)
      return
    }

    // Send a chat request message to the recipient
    signal.send('chat-request', {
      senderPublicKey: crypto.getPublicKey(),
      receiverId: ciphoraId
    })
    console.log('Chat request sent')
  })
  // When user wants to deletes chat
  ipcMain.on('delete-chat', async (event, chatId) => {
    // Delete chat and keys
    await Promise.all([chats.delete(chatId), crypto.deleteKey(chatId)])
    // Update UI
    windows.main.send('update-chats', chats.getAll(), chats.getLatestId(), true)
  })
  // When user wants to copy a chat PGP key
  ipcMain.on('copy-pgp', async (event, chatId) =>
    clipboard.writeText(crypto.getChatPublicKey(chatId))
  )
  // When user selects a chat
  ipcMain.handle('activate-chat', async (event, chatId) =>
    state.set('lastActiveChat', chatId)
  )
  // When user wants to generate a new PGP key
  ipcMain.handle('create-pgp', async (event, params) =>
    crypto.generateKey(params)
  )
  // When user wants to import a new PGP key
  ipcMain.handle('import-pgp', async (event, params) =>
    crypto.importKey(params)
  )

  /**
   * Init
   *****************************/
  // Init PGP keys, state and chats and main window in parallel
  const [keyExists] = await Promise.all([
    crypto.init(),
    chats.init(),
    state.init(),
    windows.main.init()
  ])

  // Check if user's PGP key exists
  if (!keyExists) {
    // Launch PGP key setup
    windows.main.send('open-modal', 'setupIdentity')
    // Wait until setup is complete i.e. PGP key has been generated/imported
    await crypto.hasKey()
  }

  userId = crypto.getId()
  // Get last active chat
  const lastActiveChat = state.get('lastActiveChat', chats.getLatestId())
  // Populate UI with chats
  windows.main.send('update-chats', chats.getAll(), lastActiveChat)

  // TODO: remove this (debug)
  console.log('------> CiphoraId', userId)
  windows.main.send('log', userId)
  ipcMain.on('get-chats', async event =>
    windows.main.send('update-chats', chats.getAll(), lastActiveChat)
  )

  try {
    // Authenticate with and connect to the signal server
    const authRequest = await crypto.generateAuthRequest()
    await signal.connect(userId, authRequest)
    console.log('Connected to server')
  } catch (error) {
    // Notify user of it
    windows.main.send(
      'notify',
      'Failed to connect to the server',
      'error',
      true,
      4000
    )
  }

  // Establish connections with chat peers
  Object.values(chats.getAll())
    .filter(chat => !peers.has(chat.id)) // Ignore already connecting to
    .forEach(chat => peers.connect(chat.id))
})()
