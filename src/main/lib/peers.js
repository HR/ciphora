'use strict'
/**
 * Peers class
 * Initiates and manages peer connections
 */

const Peer = require('simple-peer'),
  EventEmitter = require('events'),
  wrtc = require('wrtc'),
  moment = require('moment')

module.exports = class Peers extends EventEmitter {
  constructor (signal) {
    // Ensure singleton
    if (!!Peers.instance) {
      return Peers.instance
    }

    // Call EventEmitter constructor
    super()

    this._peers = {}
    this._signal = signal
    this._requests = {}

    // Bindings
    this._addPeer = this._addPeer.bind(this)
    this._onSignalRequest = this._onSignalRequest.bind(this)
    this._onSignalAccept = this._onSignalAccept.bind(this)
    this._onSignal = this._onSignal.bind(this)
    this._onSignalReceiverOffline = this._onSignalReceiverOffline.bind(this)

    // Add signal event listeners
    this._signal.on('signal-request', this._onSignalRequest)
    this._signal.on('signal-accept', this._onSignalAccept)
    this._signal.on('signal', this._onSignal)
    this._signal.on('unknown-receiver', this._onSignalReceiverOffline)

    Peers.instance = this
  }

  // Handles signal requests
  _onSignalRequest ({ senderId, timestamp }) {
    console.log('Signal request received')
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
  _onSignalReceiverOffline (receiverId) {
    if (this._requests[receiverId]) {
      console.log('Signal receiver offline')
      // Delete request to allow offline peer to connect if it comes online
      delete this._requests[receiverId]
    }
  }

  // Removes given peer
  _removePeer (id) {
    if (this._peers[id]) {
      this._peers[id].destroy()
      delete this._peers[id]
    }
  }

  // Initiates a connection with the given peer
  _addPeer (initiator, userId) {
    const peer = (this._peers[userId] = new Peer({ initiator, wrtc: wrtc }))
    const type = initiator ? 'Sender' : 'Receiver'
    peer.isConnected = false

    peer.on('signal', data => {
      // Trickle signal data to the peer
      this._signal.send('signal', {
        receiverId: userId,
        data
      })
      console.log(type, 'got signal and sent')
    })

    peer.on('connect', () => {
      peer.isConnected = true
      this.emit('connect', userId, initiator)
    })

    peer.on('close', () => {
      peer.isConnected = false
      this.emit('disconnect', userId)
    })

    peer.on('error', err => this.emit('error', userId, err))

    peer.on('data', data => {
      // Try to deserialize message
      try {
        const dataString = Buffer.isBuffer(data) ? data.toString() : data
        const { type, ...message } = JSON.parse(dataString)
        console.log(`Got ${type}:`, message)
        this.emit(type, userId, message)
      } catch (e) {
        this.emit('error', e)
      }
    })
  }

  // Adds sender to initiate a connection with receiving peer
  _addSender (...args) {
    this._addPeer(true, ...args)
  }

  // Adds a receiver to Initiate a connection with sending peer
  _addReceiver (...args) {
    this._addPeer(false, ...args)
  }

  // Connects to given peer
  connect (receiverId) {
    // Start connection
    const signalRequest = (this._requests[receiverId] = {
      receiverId,
      timestamp: new Date().toISOString()
    })
    // Send a signal request to peer
    this._signal.send('signal-request', signalRequest)
    console.log('Signal request sent')
  }

  // Checks if given peer has been added
  has (id) {
    return this._peers.hasOwnProperty(id)
  }

  // Checks if given peer is connected
  isConnected (id) {
    return this._peers[id] && this._peers[id].isConnected
  }

  // Sends a message to given peer
  _send (type, receiverId, message) {
    if (!this.isConnected(receiverId)) {
      return false
    }
    // Serialize and send
    const serializedMessage = JSON.stringify({
      type,
      ...message
    })
    this._peers[receiverId].send(serializedMessage)
    console.log(type, 'sent', message)
    return true
  }

  // Sends own ephemeral public key to given peer
  sendKey (...args) {
    return this._send('key', ...args)
  }

  // Sends a chat message to given peer
  sendMessage (...args) {
    return this._send('message', ...args)
  }
}
