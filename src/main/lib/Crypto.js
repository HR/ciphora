'use strict'
/**
 * Crypto class
 * Manages all keys and provides all crypto functionality
 */

const crypto = require('crypto'),
  fs = require('fs'),
  keytar = require('keytar'),
  pgp = require('openpgp'),
  hkdf = require('futoin-hkdf'),
  // TODO: Replace with crypto.diffieHellman once nodejs#26626 lands on v12 LTS
  { box } = require('tweetnacl'),
  { waitUntil, parseAddress, chunk, isEmpty, hexToUint8 } = require('./util'),
  SELFKEY_DB_KEY = 'selfKey',
  CHATKEYS_DB_KEY = 'chatKeys',
  SERVICE = 'ciphora',
  CIPHER = 'aes-256-cbc',
  RATCHET_KEYS_LEN = 64,
  RATCHET_KEYS_HASH = 'SHA-256',
  MESSAGE_KEY_LEN = 80,
  MESSAGE_CHUNK_LEN = 32,
  MESSAGE_KEY_SEED = 1, // 0x01
  CHAIN_KEY_SEED = 2, // 0x02
  RACHET_MESSAGE_COUNT = 10 // Rachet after this no of messages sent

// Enable compression by default
pgp.config.compression = pgp.enums.compression.zlib

module.exports = class Crypto {
  constructor (store) {
    // Ensure singleton
    if (!!Crypto.instance) {
      return Crypto.instance
    }

    this._store = store
    this._chatKeys = {}
    this._selfKey = {}
    this._armoredChatKeys = {}
    this._armoredSelfKey = {}

    // Bindings
    this.init = this.init.bind(this)

    Crypto.instance = this
  }

  // Initialise chat PGP keys and load own from store
  async init () {
    // Load chat keys if they exist
    try {
      this._armoredChatKeys = await this._store.get(CHATKEYS_DB_KEY)
      if (this._armoredChatKeys) {
        const loads = Object.values(this._armoredChatKeys).map(key =>
          this.addKey(key.id, key.publicKeyArmored, false)
        )
        await Promise.all(loads)
        console.log('Initialised chat keys', this._chatKeys)
      }
    } catch (err) {
      // Ignore not found err
      if (!err.notFound) throw err
    }
    // Load self key if it exists
    try {
      this._armoredSelfKey = await this._store.get(SELFKEY_DB_KEY)
      // Get the PGP private key passphrase from the OS's keychain
      const passphrase = await keytar.getPassword(
        SERVICE,
        this._armoredSelfKey.user.id
      )
      if (!passphrase) return false
      await this._initKey(passphrase)
      console.log('Loaded self keys')
      return true
    } catch (err) {
      // No self keys exist
      if (err.notFound) return false
      throw err
    }
  }

  // Waits until own PGP key has been generated/imported if no own PGP key
  async whenReady () {
    await waitUntil(() => !isEmpty(this._selfKey))
  }

  // Gets own user info
  getUserInfo () {
    return this._armoredSelfKey.user
  }

  // Gets own PGP public key
  getPublicKey () {
    return this._armoredSelfKey.publicKeyArmored
  }

  // Gets own PGP key info (id, name,...)
  getPublicKeyInfo () {
    const { id } = this._armoredSelfKey
    const address = parseAddress(this._selfKey.publicKey.getUserIds())
    return { id, ...address }
  }

  // Gets chat PGP public key
  getChatPublicKey (id) {
    return this._armoredChatKeys[id].publicKeyArmored
  }

  // Extracts the id (fingerprint) and address of the given PGP key
  async getPublicKeyInfoOf (publicKeyArmored) {
    const {
      keys: [publicKey]
    } = await pgp.key.readArmored(publicKeyArmored)
    const id = publicKey.getFingerprint()
    const address = parseAddress(publicKey.getUserIds())
    return { id, address }
  }

  // Imports a new chat PGP key
  async addKey (id, publicKeyArmored, save = true) {
    const {
      keys: [publicKey]
    } = await pgp.key.readArmored(publicKeyArmored)
    this._chatKeys[id] = { publicKey }
    if (!save) return
    this._armoredChatKeys[id] = { id, publicKeyArmored }
    await this._saveChatKeys()
    console.log('Added key', this._chatKeys)
  }

  // Deletes a chat PGP key
  async deleteKey (id) {
    delete this._chatKeys[id]
    delete this._armoredChatKeys[id]
    await this._saveChatKeys()
    console.log('Deleted key', id)
  }

  // Imports the given PGP public key and private key as own PGP key
  async importKey ({ passphrase, publicKeyArmored, privateKeyArmored }) {
    this._armoredSelfKey = { publicKeyArmored, privateKeyArmored }
    await this._initKey(passphrase)
    await this._saveKey(passphrase)
    console.log('Imported self key')
  }

  // Generates new PGP key and sets it up as own PGP key
  async generateKey ({ passphrase, algo, ...userIds }) {
    const [type, variant] = algo.split('-')
    let genAlgo
    try {
      // Parse the type of key generation algorithm selected
      switch (type) {
        case 'rsa':
          genAlgo = {
            rsaBits: parseInt(variant) // RSA key length
          }
          break
        case 'ecc':
          genAlgo = {
            curve: variant // ECC curve name
          }
          break
        default:
          throw new Error('Unrecognised key generation algorithm')
      }

      // Generate new PGP key with the details supplied
      const { key, ...keyData } = await pgp.generateKey({
        userIds: [userIds],
        ...genAlgo,
        passphrase
      })
      this._armoredSelfKey = keyData
      await this._initKey(passphrase)
      await this._saveKey(passphrase)
      console.log('Generated self key')
    } catch (err) {
      return err
    }
  }

  // Signs a message with own PGP key
  async sign (message) {
    const { privateKey } = this._selfKey
    const { signature } = await pgp.sign({
      message: pgp.cleartext.fromText(message),
      privateKeys: [privateKey],
      detached: true
    })
    console.log('PGP signed message')
    return signature
  }

  // Verifies a message with user's PGP key
  async verify (id, message, signature) {
    // Get user's public key
    const { publicKey } = this._chatKeys[id]
    // Fail verification if all params are not supplied
    if (!message || !publicKey || !signature) return false
    const verified = await pgp.verify({
      message: pgp.cleartext.fromText(message),
      signature: await pgp.signature.readArmored(signature),
      publicKeys: [publicKey]
    })
    console.log('PGP verified message')
    return verified.signatures[0].valid
  }

  // Generates a server connection authentication request
  async generateAuthRequest () {
    const timestamp = new Date().toISOString()
    const signature = await this.sign(timestamp)
    const publicKey = this._armoredSelfKey.publicKeyArmored
    return { publicKey, timestamp, signature }
  }

  // Saves own PGP key to the store
  async _saveKey (passphrase) {
    // Save the PGP passphrase for the private in the OS's keychain
    // Use user id as account name
    await keytar.setPassword(SERVICE, this._armoredSelfKey.user.id, passphrase)
    // Save in store
    await this._store.put(SELFKEY_DB_KEY, this._armoredSelfKey)
    console.log('Saved self keys')
  }

  // Saves the chat PGP keys to the store
  async _saveChatKeys () {
    await this._store.put(CHATKEYS_DB_KEY, this._armoredChatKeys)
    console.log('Saved chat keys')
  }

  // Initialises own PGP key and decrypts its private key
  async _initKey (passphrase) {
    const { publicKeyArmored, privateKeyArmored, user } = this._armoredSelfKey
    const {
      keys: [publicKey]
    } = await pgp.key.readArmored(publicKeyArmored)
    const {
      keys: [privateKey]
    } = await pgp.key.readArmored(privateKeyArmored)

    await privateKey.decrypt(passphrase)
    // Set user info if not already set
    if (!user) {
      this._armoredSelfKey.user = {
        id: publicKey.getFingerprint(),
        ...parseAddress(publicKey.getUserIds())
      }
    }
    // Init key
    this._selfKey = {
      publicKey,
      privateKey
    }

    console.log('Initialised self key')
  }

  // Returns a hash digest of the given data
  hash (data, enc = 'hex', alg = 'sha256') {
    return crypto
      .createHash(alg)
      .update(data)
      .digest(enc)
  }

  // Returns a hash digest of the given file
  hashFile (path, enc = 'hex', alg = 'sha256') {
    return new Promise((resolve, reject) =>
      fs
        .createReadStream(path)
        .on('error', reject)
        .pipe(crypto.createHash(alg).setEncoding(enc))
        .once('finish', function () {
          resolve(this.read())
        })
    )
  }

  // Hash Key Derivation Function (based on HMAC)
  _HKDF (input, salt, info, length = RATCHET_KEYS_LEN) {
    // input = input instanceof Uint8Array ? Buffer.from(input) : input
    // salt = salt instanceof Uint8Array ? Buffer.from(salt) : salt
    return hkdf(input, length, {
      salt,
      info,
      hash: RATCHET_KEYS_HASH
    })
  }

  // Hash-based Message Authentication Code
  _HMAC (key, data, enc = 'utf8', algo = 'sha256') {
    return crypto
      .createHmac(algo, key)
      .update(data)
      .digest(enc)
  }

  // Generates a new Curve25519 key pair
  _generateRatchetKeyPair () {
    let keyPair = box.keyPair()
    // Encode in hex for easier handling
    keyPair.publicKey = Buffer.from(keyPair.publicKey).toString('hex')
    return keyPair
  }

  // Initialises an end-to-end encryption session
  async initSession (id) {
    // Generates a new ephemeral ratchet Curve25519 key pair for chat
    let { publicKey, secretKey } = this._generateRatchetKeyPair()
    // Initialise session object
    this._chatKeys[id].session = {
      currentRatchet: {
        sendingKeys: {
          publicKey,
          secretKey
        },
        previousCounter: 0
      },
      sending: {},
      receiving: {}
    }
    // Sign public key
    const timestamp = new Date().toISOString()
    const signature = await this.sign(publicKey + timestamp)
    console.log('Initialised new session', this._chatKeys[id].session)
    return { publicKey, timestamp, signature }
  }

  // Starts the session
  async startSession (id, keyMessage) {
    const { publicKey, timestamp, signature } = keyMessage
    // Validate sender public key
    const sigValid = await this.verify(id, publicKey + timestamp, signature)
    // Ignore if new encryption session if signature not valid
    if (!sigValid) return console.log('PubKey sig invalid', publicKey)

    const ratchet = this._chatKeys[id].session.currentRatchet
    const { secretKey } = ratchet.sendingKeys
    ratchet.receivingKey = publicKey
    // Derive shared master secret and root key
    const [rootKey] = this._calcRatchetKeys(
      'CiphoraSecret',
      secretKey,
      publicKey
    )
    ratchet.rootKey = rootKey
    console.log(
      'Initialised Session',
      rootKey.toString('hex'),
      this._chatKeys[id].session
    )
  }

  // Calculates the ratchet keys (root and chain key)
  _calcRatchetKeys (oldRootKey, sendingSecretKey, receivingKey) {
    // Convert receivingKey to a Uint8Array if it isn't already
    if (typeof receivingKey === 'string')
      receivingKey = hexToUint8(receivingKey)
    // Derive shared ephemeral secret
    const sharedSecret = box.before(receivingKey, sendingSecretKey)
    // Derive the new ratchet keys
    const ratchetKeys = this._HKDF(sharedSecret, oldRootKey, 'CiphoraRatchet')
    console.log('Derived ratchet keys', ratchetKeys.toString('hex'))
    // Chunk ratchetKeys output into its parts: root key and chain key
    return chunk(ratchetKeys, RATCHET_KEYS_LEN / 2)
  }

  // Calculates the next receiving or sending ratchet
  _calcRatchet (session, sending, receivingKey) {
    let ratchet = session.currentRatchet
    let ratchetChains, publicKey, previousChain

    if (sending) {
      ratchetChains = session.sending
      previousChain = ratchetChains[ratchet.sendingKeys.publicKey]
      // Replace ephemeral ratchet sending keys with new ones
      ratchet.sendingKeys = this._generateRatchetKeyPair()
      publicKey = ratchet.sendingKeys.publicKey
      console.log('New sending keys generated', publicKey)
    } else {
      // TODO: Check counters to pre-compute skipped keys
      ratchetChains = session.receiving
      previousChain = ratchetChains[ratchet.receivingKey]
      publicKey = ratchet.receivingKey = receivingKey
    }

    if (previousChain) {
      // Update the previousCounter with the previous chain counter
      ratchet.previousCounter = previousChain.chain.counter
    }
    // Derive new ratchet keys
    const [rootKey, chainKey] = this._calcRatchetKeys(
      ratchet.rootKey,
      ratchet.sendingKeys.secretKey,
      ratchet.receivingKey
    )
    // Update root key
    ratchet.rootKey = rootKey
    // Initialise new chain
    ratchetChains[publicKey] = {
      messageKeys: {},
      chain: {
        counter: -1,
        key: chainKey
      }
    }
    return ratchetChains[publicKey]
  }

  // Calculates the next message key for the ratchet and updates it
  // TODO: Try to get messagekey with message counter otherwise calculate all
  // message keys up to it and return it (instead of pre-comp on ratchet)
  _calcMessageKey (ratchet) {
    let chain = ratchet.chain
    // Calculate next message key
    const messageKey = this._HMAC(chain.key, Buffer.alloc(1, MESSAGE_KEY_SEED))
    // Calculate next ratchet chain key
    chain.key = this._HMAC(chain.key, Buffer.alloc(1, CHAIN_KEY_SEED))
    // Increment the chain counter
    chain.counter++
    // Save the message key
    ratchet.messageKeys[chain.counter] = messageKey
    console.log('Calculated next messageKey', ratchet)
    // Derive encryption key, mac key and iv
    return chunk(
      this._HKDF(messageKey, 'CiphoraCrypt', null, MESSAGE_KEY_LEN),
      MESSAGE_CHUNK_LEN
    )
  }

  // Encrypts a message
  async encrypt (id, message, isFile) {
    let session = this._chatKeys[id].session
    let ratchet = session.currentRatchet
    let sendingChain = session.sending[ratchet.sendingKeys.publicKey]
    // Ratchet after every RACHET_MESSAGE_COUNT of messages
    let shouldRatchet =
      sendingChain && sendingChain.chain.counter >= RACHET_MESSAGE_COUNT
    if (!sendingChain || shouldRatchet) {
      sendingChain = this._calcRatchet(session, true)
      console.log('Calculated new sending ratchet', session)
    }
    const { previousCounter } = ratchet
    const { publicKey } = ratchet.sendingKeys
    const [encryptKey, macKey, iv] = this._calcMessageKey(sendingChain)
    console.log(
      'Calculated encryption creds',
      encryptKey.toString('hex'),
      iv.toString('hex')
    )
    const { counter } = sendingChain.chain
    // Encrypt message contents
    const messageCipher = crypto.createCipheriv(CIPHER, encryptKey, iv)
    const content =
      messageCipher.update(message.content, 'utf8', 'hex') +
      messageCipher.final('hex')

    // Construct full message
    let encryptedMessage = {
      ...message,
      publicKey,
      previousCounter,
      counter,
      content
    }
    // Sign message with PGP
    encryptedMessage.signature = await this.sign(
      JSON.stringify(encryptedMessage)
    )

    if (isFile) {
      // Return cipher
      const contentCipher = crypto.createCipheriv(CIPHER, encryptKey, iv)
      return { encryptedMessage, contentCipher }
    }

    return { encryptedMessage }
  }

  // Decrypts a message
  async decrypt (id, signedMessage, isFile) {
    const { signature, ...fullMessage } = signedMessage
    const sigValid = await this.verify(
      id,
      JSON.stringify(fullMessage),
      signature
    )
    // Ignore message if signature invalid
    if (!sigValid) {
      console.log('Message signature invalid!')
      return false
    }
    const { publicKey, counter, previousCounter, ...message } = fullMessage
    let session = this._chatKeys[id].session
    let receivingChain = session.receiving[publicKey]
    if (!receivingChain) {
      // Receiving ratchet for key does not exist so create one
      receivingChain = this._calcRatchet(session, false, publicKey)
      console.log('Calculated new receiving ratchet', receivingChain)
    }
    // Derive decryption credentials
    const [decryptKey, macKey, iv] = this._calcMessageKey(receivingChain)
    console.log(
      'Calculated decryption creds',
      decryptKey.toString('hex'),
      iv.toString('hex')
    )
    // Decrypt the message contents
    const messageDecipher = crypto.createDecipheriv(CIPHER, decryptKey, iv)
    const content =
      messageDecipher.update(message.content, 'hex', 'utf8') +
      messageDecipher.final('utf8')
    console.log('--> Decrypted content', content)

    const decryptedMessage = { ...message, content }

    if (isFile) {
      // Return Decipher
      const contentDecipher = crypto.createDecipheriv(CIPHER, decryptKey, iv)
      return { decryptedMessage, contentDecipher }
    }

    return { decryptedMessage }
  }
}
