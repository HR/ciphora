'use strict'
/**
 * Constants (static)
 */

module.exports = {
  PGP_KEY_ALGOS: [
    'rsa-4096',
    'rsa-2048',
    'ecc-curve25519',
    'ecc-ed25519',
    'ecc-p256',
    'ecc-p384',
    'ecc-p521',
    'ecc-secp256k1',
    'ecc-brainpoolP256r1',
    'ecc-brainpoolP384r1',
    'ecc-brainpoolP512r1'
  ],
  COMPOSE_CHAT_ID: 'newchat',
  CONTENT_TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    FILE: 'file'
  }
}
