'use strict'
/**
 * Main App
 *****************************/
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
  Crypto = require('./lib/Crypto'),
  Server = require('./lib/Server'),
  Peers = require('./lib/Peers'),
  Chats = require('./lib/Chats'),
  State = require('./lib/State'),
  { CONTENT_TYPES } = require('../consts'),
  menu = require('./menu'),
  windows = require('./windows'),
  { DB_PATH } = require('../config')

unhandled()
// debug()
contextMenu()

app.setAppUserModelId(packageJson.build.appId)
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
    console.info('Second instance')
    dbPath += '2'
  }
}

app.on('window-all-closed', () => {
  if (!is.macos) {
    app.quit()
  }
})

app.on('activate', windows.main.activate)

/**
 * Main
 *****************************/
;(async () => {
  console.log('\n\n\n**********************************************> New run\n')

  await app.whenReady()
  Menu.setApplicationMenu(menu)

  let profile
  const db = await levelup(encode(leveldown(dbPath), { valueEncoding: 'json' }))
  const crypto = new Crypto(db)
  const state = new State(db)
  const chats = new Chats(db)
  const server = new Server()
  const peers = new Peers(server, crypto, chats)

  /**
   * App events
   *****************************/
  app.on('delete-messages', deleteMessagesHandler)

  /**
   * Server events
   *****************************/
  // When a new chat request is received from a user
  server.on('chat-request', chatRequestHandler)
  // When the chat request is accepted from the user
  server.on('chat-accept', chatAcceptHandler)
  // When the user for a message cannot be found
  server.on('unknown-receiver', receiverNotFoundHandler)

  /**
   * Peers events
   *****************************/
  // When a new connection with a user is established
  peers.on('connect', peerConnectHandler)
  // When a connection with a user is closed
  peers.on('disconnect', peerDisconnectHandler)
  // When a connection error with a user occurs
  peers.on('error', peerErrorHandler)
  // When a new message from a user is received
  peers.on('message', peerMessageHandler)

  /**
   * IPC events
   *****************************/
  // When a message is sent by the user
  ipcMain.on('send-message', sendMessageHandler)
  // When the user adds a new chat with a new recipient
  ipcMain.on('add-chat', addChatHandler)
  // When user deletes a chat
  ipcMain.on('delete-chat', deleteChatHandler)
  // When user wants to copy a PGP key
  ipcMain.on('copy-pgp', copyPGPHandler)
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
    // Launch identity setup
    windows.main.send('open-modal', 'setupIdentity')
    // Wait until setup is complete i.e. PGP key has been generated/imported
    await crypto.whenReady()
  }

  // Get the profile
  profile = crypto.getUserInfo()
  console.info('Profile:', profile)

  // Get last active chat
  const activeChatId = state.get('lastActiveChat', chats.getLatestId() || '')
  // Populate UI
  windows.main.send('update-state', {
    chats: chats.getAll(),
    activeChatId,
    profile
  })
  ipcMain.on('do-update-state', async event =>
    windows.main.send('update-state', {
      chats: chats.getAll(),
      activeChatId,
      profile
    })
  )

  try {
    // Authenticate with and connect to the signal server
    const authRequest = await crypto.generateAuthRequest()
    await server.connect(profile.id, authRequest)
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

  // Establish connections with all chat peers
  Object.values(chats.getAll())
    .filter(chat => !peers.has(chat.id)) // Ignore ones already connecting to
    .forEach(chat => peers.connect(chat.id))

  /**
   * Handlers
   *****************************/
  /* App handlers */
  async function deleteMessagesHandler () {
    await chats.deleteAllMessages()
    windows.main.send('update-state', { chats: chats.getAll() })
  }

  /* Server handlers */
  async function chatRequestHandler ({ senderPublicKey: publicKeyArmored }) {
    console.log('Chat request received')
    // TODO: Check id against block/removed list and add to chats
    const { id, address } = await crypto.getPublicKeyInfoOf(publicKeyArmored)
    if (!chats.has(id)) {
      // Add chat if not already added
      await chats.add(id, publicKeyArmored, address)
      await crypto.addKey(id, publicKeyArmored)
      windows.main.send('update-state', { chats: chats.getAll() })
    }
    // Accept chat request by default
    server.send('chat-accept', {
      senderPublicKey: crypto.getPublicKey(),
      receiverId: id
    })
    console.log('Chat request accepted')
  }
  async function chatAcceptHandler ({ senderId, senderPublicKey }) {
    console.log('Chat request accepted')
    const { address } = await crypto.getPublicKeyInfoOf(senderPublicKey)
    // Add chat
    await chats.add(senderId, senderPublicKey, address)
    await crypto.addKey(senderId, senderPublicKey)
    // Update UI
    windows.main.send(
      'update-state',
      { chats: chats.getAll(), activeChatId: senderId },
      true
    )
    // Establish a connection
    peers.connect(senderId)
  }
  function receiverNotFoundHandler ({ type, receiverId }) {
    if (type === 'chat-request') {
      windows.main.send(
        'notify',
        'Recipient not on Ciphora or is offline',
        'error',
        true,
        4000
      )
    }
  }

  /* Peers handlers */
  async function peerConnectHandler (userId) {
    console.log('Connected with', userId)
    // Set user as online
    chats.setOnline(userId)
    // Update UI
    windows.main.send('update-state', { chats: chats.getAll() })
  }
  async function peerDisconnectHandler (userId) {
    console.log('Disconnected with', userId)
    chats.setOffline(userId)
    // Update UI
    windows.main.send('update-state', { chats: chats.getAll() })
  }
  function peerErrorHandler (userId, err) {
    console.log('Error connecting with peer', userId)
    console.error(err)
  }
  async function peerMessageHandler (senderId, message) {
    console.log('Got message', message)
    chats.addMessage(senderId, message)
    windows.main.send('update-state', { chats: chats.getAll() })
  }

  /* IPC handlers */
  async function sendMessageHandler (event, contentType, content, receiverId) {
    // Construct message
    let contentPath
    let message = {
      sender: profile.id,
      content,
      contentType, // mime-type of message
      timestamp: new Date().toISOString()
    }

    // Set the id of the message to its hash
    message.id = crypto.hash(JSON.stringify(message))
    console.log('Adding message', message)
    // TODO: Copy media to media dir
    // Optimistically update UI
    chats.addMessage(receiverId, { ...message })
    windows.main.send('update-state', { chats: chats.getAll() })

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

    // Send the message
    peers.send(message.id, receiverId, message, true, contentPath)
  }
  async function addChatHandler (event, ciphoraId, publicKeyArmored) {
    if (!ciphoraId) {
      // ciphoraId, i.e. the userId, is not given so try to extract it from the
      // given PGP publicKey
      try {
        const { id } = await crypto.getPublicKeyInfoOf(publicKeyArmored)
        ciphoraId = id
      } catch (err) {
        windows.main.send('notify', 'Invalid PGP key', 'error', true, 4000)
      }
    }
    // Normalise the userId
    ciphoraId = ciphoraId.toLowerCase()
    // Ensure it hasn't been already added or is own
    if (chats.has(ciphoraId) || ciphoraId === profile.id) {
      windows.main.send('notify', 'Already added', null, true, 4000)
      return
    }

    // Send a chat request message to the recipient
    server.send('chat-request', {
      senderPublicKey: crypto.getPublicKey(),
      receiverId: ciphoraId
    })
    console.log('Chat request sent')
  }
  async function deleteChatHandler (event, chatId) {
    // Delete chat, keys and disconnect in parallel
    await Promise.all([
      chats.delete(chatId),
      crypto.deleteKey(chatId),
      peers.disconnect(chatId)
    ])
    // Update UI
    windows.main.send(
      'update-state',
      { chats: chats.getAll(), activeChatId: chats.getLatestId() },
      true
    )
  }
  async function copyPGPHandler (event, chatId) {
    if (chatId) {
      // Copy PGP of given userId
      clipboard.writeText(crypto.getChatPublicKey(chatId))
      return
    }
    // Otherwise, copy own PGP key
    clipboard.writeText(crypto.getKey().join('\n'))
  }
})()
