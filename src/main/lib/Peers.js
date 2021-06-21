'use strict'
/**
 * Peers class
 * Manages peer connections and communication
 */

const stream = require('stream'),
  EventEmitter = require('events'),
  path = require('path'),
  util = require('util'),
  fs = require('fs'),
  brake = require('brake'),
  wrtc = require('wrtc'),
  moment = require('moment'),
  Peer = require('./simple-peer'),
  Queue = require('./Queue'),
  { CONTENT_TYPES } = require('../../consts'),
  { MEDIA_DIR } = require('../../config'),
  // http://viblast.com/blog/2015/2/5/webrtc-data-channel-message-size/
  MESSAGE_CHUNK_SIZE = 16 * 1024, // (16kb)
  MESSAGE_STREAM_RATE = 50 // ms
const { mkdir } = fs.promises
const pipeline = util.promisify(stream.pipeline)

module.exports = class Peers extends EventEmitter {
  constructor (signal, crypto, chats) {
    // Ensure singleton
    if (!!Peers.instance) {
      return Peers.instance
    }

    // Call EventEmitter constructor
    super()

    this._peers = {}
    this._requests = {}
    this._signal = signal
    this._crypto = crypto
    this._chats = chats
    this._sendingQueue = new Queue()
    this._receivingQueue = new Queue()

    // Bindings
    this._addPeer = this._addPeer.bind(this)
    this._onSignalRequest = this._onSignalRequest.bind(this)
    this._onSignalAccept = this._onSignalAccept.bind(this)
    this._onSignal = this._onSignal.bind(this)
    this._onSignalReceiverOffline = this._onSignalReceiverOffline.bind(this)

    // Add queue event listeners
    this._sendingQueue.on('error', (...args) =>
      this.emit('send-error', ...args)
    )
    this._receivingQueue.on('error', (...args) =>
      this.emit('receive-error', ...args)
    )

    // Add signal event listeners
    this._signal.on('signal-request', this._onSignalRequest)
    this._signal.on('signal-accept', this._onSignalAccept)
    this._signal.on('signal', this._onSignal)
    this._signal.on('unknown-receiver', this._onSignalReceiverOffline)

    Peers.instance = this
  }

  // Connects to given peer
  connect (userId) {
    // Start connection
    const signalRequest = (this._requests[userId] = {
      receiverId: userId,
      timestamp: new Date().toISOString()
    })
    // Send a signal request to peer
    this._signal.send('signal-request', signalRequest)
    console.log('Connecting with', userId)
  }

  // Disconnects from given peer
  disconnect (userId) {
    this._removePeer(userId)
    console.log('Disconnected from', userId)
  }

  // Checks if given peer has been added
  has (id) {
    return this._peers.hasOwnProperty(id)
  }

  // Checks if given peer is connected
  isConnected (id) {
    return this._peers[id] && this._peers[id]._isConnected
  }

  // Queues a chat message to be sent to given peer
  send (userId, ...args) {
    this._sendingQueue.add(() => this._send('message', ...args), userId)
  }

  // Handles signal requests
  _onSignalRequest ({ senderId, timestamp }) {
    console.log('Signal request received')
    // Ensure chat exists with signal sender
    if (!this._chats.has(senderId)) return console.log('Rejected as no chat')

    const request = this._requests[senderId]
    // If a request to the sender has not already been sent then just accept it
    // Add receiver to receive signal
    if (!request) {
      this._addReceiver(senderId)
      this._signal.send('signal-accept', { receiverId: senderId })
      console.log('Signal request not sent to sender so accepted')
      return
    }

    // Parse request times
    const requestTime = moment(request.timestamp)
    const receivedRequestTime = moment(timestamp)

    // If received request was sent before own request then accept it
    // Add receiver to receive signal and forget own request
    // Avoids race condition when both peers send signal-requests
    if (receivedRequestTime.isBefore(requestTime)) {
      this._addReceiver(senderId)
      this._signal.send('signal-accept', { receiverId: senderId })
      delete this._requests[senderId]
      console.log('Signal request sent before own so accepted')
    }

    // Otherwise don't do anything (wait for signal-accept as the sender)
  }

  // Handles accepted signal requests
  _onSignalAccept ({ senderId }) {
    console.log('Signal request accepted')
    // Start signalling
    this._addSender(senderId)
    delete this._requests[senderId]
  }

  // Handles new signals
  _onSignal ({ senderId, data }) {
    // Ensure peer to signal exists
    if (!this._peers[senderId]) {
      throw new Error(`Peer ${senderId} not yet added`)
    }

    this._peers[senderId].signal(data)
  }

  // Handles offline receivers
  _onSignalReceiverOffline ({ receiverId }) {
    if (this._requests[receiverId]) {
      console.log('Signal receiver offline')
      // Delete request to allow offline peer to connect if it comes online
      delete this._requests[receiverId]
    }
  }

  // Removes given peer by id
  _removePeer (id) {
    if (this._peers[id]) {
      this._peers[id].destroy()
      delete this._peers[id]
    }
  }

  // Adds sender to initiate a connection with receiving peer
  _addSender (...args) {
    this._addPeer(true, ...args)
  }

  // Adds a receiver to Initiate a connection with sending peer
  _addReceiver (...args) {
    this._addPeer(false, ...args)
  }

  // Initiates a connection with the given peer and sets up communication
  _addPeer (initiator, userId) {
    const peer = (this._peers[userId] = new Peer({
      initiator,
      wrtc: wrtc,
      reconnectTimer: 1000
    }))
    const type = initiator ? 'Sender' : 'Receiver'
    peer._isConnected = false

    peer.on('signal', data => {
      // Trickle signal data to the peer
      this._signal.send('signal', {
        receiverId: userId,
        data
      })
      console.log(type, 'got signal and sent')
    })

    peer.on('connect', async () => {
      peer._isConnected = true
      // Initialises a chat session
      const keyMessage = await this._crypto.initSession(userId)
      // Send the master secret public key with signature to the user
      this._send('key', userId, keyMessage, false)

      this.emit('connect', userId, initiator)
    })

    peer.on('close', () => {
      peer._isConnected = false
      this.emit('disconnect', userId)
    })

    peer.on('error', err => this.emit('error', userId, err))

    peer.on('data', data =>
      // Queue to receive
      this._receivingQueue.add(() =>
        this._onMessage(userId, data.toString('utf8'))
      )
    )

    peer.on('datachannel', (datachannel, id) =>
      // Queue to receive
      this._receivingQueue.add(() =>
        this._onDataChannel(userId, datachannel, id)
      )
    )
  }

  // Handles new messages
  async _onMessage (userId, data) {
    // Try to deserialize message
    console.log('------> Got new message', data)
    const { type, ...message } = JSON.parse(data)

    if (type === 'key') {
      // Start a new crypto session with received key
      this._crypto.startSession(userId, message)
      return
    }

    if (message.contentType === CONTENT_TYPES.TEXT) {
      // Decrypt received text message
      const { decryptedMessage } = await this._crypto.decrypt(userId, message)
      // Ignore if validation failed
      if (!decryptedMessage) return
      this.emit(type, userId, decryptedMessage)
      return
    }
  }

  // Handles new data channels (file streams)
  async _onDataChannel (userId, receivingStream, id) {
    console.log('------> Got new datachannel', id)
    const { type, ...message } = JSON.parse(id)
    let { decryptedMessage, contentDecipher } = await this._crypto.decrypt(
      userId,
      message,
      true
    )
    // Ignore if validation failed
    if (!decryptedMessage) return
    const mediaDir = path.join(MEDIA_DIR, userId, message.contentType)
    // Recursively make media directory
    await mkdir(mediaDir, { recursive: true })
    const contentPath = path.join(mediaDir, decryptedMessage.content)
    console.log('Writing to', contentPath)
    const contentWriteStream = fs.createWriteStream(contentPath)
    // Stream content
    await pipeline(receivingStream, contentDecipher, contentWriteStream)
    decryptedMessage.content = contentPath
    this.emit(type, userId, decryptedMessage)
  }

  // Sends a message to given peer
  async _send (type, receiverId, message, encrypt, contentPath) {
    // TODO: Queue message if not connected / no session for later
    if (!this.isConnected(receiverId)) return false

    const peer = this._peers[receiverId]

    if (encrypt) {
      // Encrypt message
      var { encryptedMessage, contentCipher } = await this._crypto.encrypt(
        receiverId,
        message,
        contentPath
      )
      message = encryptedMessage
    }

    const serializedMessage = JSON.stringify({
      type,
      ...message
    })

    // Simply send message if no file to stream
    if (!contentPath) {
      peer.write(serializedMessage)
      console.log(type, 'sent', message)
      return
    }

    // Stream file
    console.log('Streaming', message, contentPath)
    const contentReadStream = fs.createReadStream(contentPath)
    const sendingStream = peer.createDataChannel(serializedMessage)
    await pipeline(
      contentReadStream,
      contentCipher,
      // Throttle stream (backpressure)
      brake(MESSAGE_CHUNK_SIZE, { period: MESSAGE_STREAM_RATE }),
      sendingStream
    )
  }
}
