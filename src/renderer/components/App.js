import React from 'react'
import Messenger from './Messenger'
import ChatList from './ChatList'
import MessageList from './MessageList'
import SetupIdentityModal from './SetupIdentityModal'
import ImportIdentityModal from './ImportIdentityModal'
import CreateIdentityModal from './CreateIdentityModal'
import { useNotifications } from '../lib/notifications'
import { clone, friendlyError } from '../lib/util'
import { COMPOSE_CHAT_ID, CONTENT_TYPES } from '../../consts'
import { ipcRenderer, remote, shell, clipboard } from 'electron'
import '../../../static/scss/index.scss'

const { dialog } = remote
// Notification ref
let notifications = null
// Initial modal state used to reset modals
const initModalsState = {
  setupIdentity: false,
  importIdentity: false,
  createIdentity: false,
  modalMessage: {
    text: '',
    error: false
  }
}
// Validation regular expressions
const CIPHORA_ID_REGEX = /^[0-9a-fA-F]{40}$/
const WORDS_REGEX = /\S/
const PUBLIC_KEY_REGEX = /-----BEGIN PGP PUBLIC KEY BLOCK-----(.|\n|\r|\r\n)+-----END PGP PUBLIC KEY BLOCK-----/
const PRIVATE_KEY_REGEX = /-----BEGIN PGP PRIVATE KEY BLOCK-----(.|\n|\r|\r\n)+-----END PGP PRIVATE KEY BLOCK-----/m
// Open file dialog filters
let FILTERS = {}
FILTERS[CONTENT_TYPES.IMAGE] = [
  {
    name: 'Images',
    // Supported by 'img' tag
    extensions: ['jpg', 'jpeg', 'svg', 'png', 'apng', 'gif']
  }
]
FILTERS[CONTENT_TYPES.FILE] = [{ name: 'All Files', extensions: ['*'] }]
// Root component
export default class App extends React.Component {
  static contextType = useNotifications(true)
  constructor (props) {
    super(props)
    this.state = {
      chats: {},
      profile: {},
      activeChatId: '',
      composing: false,
      ...clone(initModalsState)
    }

    // Bindings
    this.closeModals = this.closeModals.bind(this)
    this.openModal = this.openModal.bind(this)
    this.importIdentityHandler = this.importIdentityHandler.bind(this)
    this.createIdentityHandler = this.createIdentityHandler.bind(this)
    this.composeChatHandler = this.composeChatHandler.bind(this)
    this.deleteChatHandler = this.deleteChatHandler.bind(this)
    this.activateChat = this.activateChat.bind(this)
    this.composeMessageHandler = this.composeMessageHandler.bind(this)
    this.updateState = this.updateState.bind(this)
    this.showModalMessage = this.showModalMessage.bind(this)
    this.showModalError = this.showModalError.bind(this)
    this.createComposeChat = this.createComposeChat.bind(this)
    this.deleteComposeChat = this.deleteComposeChat.bind(this)
    this.sendFileHandler = this.sendFileHandler.bind(this)

    // Add event listeners
    ipcRenderer.on('open-modal', (event, modal) => this.openModal(modal))
    ipcRenderer.on('modal-error', (event, err) => this.showModalError(err))
    ipcRenderer.on('update-state', this.updateState)
  }

  componentDidMount () {
    // Init notifications via the context
    notifications = this.context
    // Let main process show notifications
    ipcRenderer.on('notify', (event, ...args) => notifications.show(...args))
    // Load state from main if not already loaded
    ipcRenderer.send('do-update-state')
  }

  // Activates the selected chat
  activateChat (chatId) {
    // Check if clicked chat already active
    if (chatId === this.state.activeChatId) {
      return
    }
    // Remove compose chat when user moves to another chat
    if (this.state.activeChatId === COMPOSE_CHAT_ID) {
      this.deleteComposeChat()
    }

    this.setState({ activeChatId: chatId })
    ipcRenderer.send('activate-chat', chatId)
  }

  // Updates internal state thereby updating the UI
  updateState (event, state, resetState) {
    let newState = { ...state }
    if (resetState) {
      // Reset state
      this.closeModals()
      notifications.clear()
      newState.composing = false
    }
    this.setState(newState)
  }

  // Closes all the modals
  closeModals () {
    this.setState({
      ...clone(initModalsState)
    })
  }

  // Shows the specified modal
  openModal (name) {
    let newModalState = clone(initModalsState)
    newModalState[name] = true
    this.setState(newModalState)
  }

  showModalError (text) {
    this.showModalMessage(text, true)
  }

  showModalMessage (text, error = false) {
    this.setState({
      modalMessage: { text, error }
    })
  }

  // Handles importing a new PGP key
  importIdentityHandler (params) {
    const { keys, passphrase } = params
    let pub = keys.match(PUBLIC_KEY_REGEX)
    let priv = keys.match(PRIVATE_KEY_REGEX)

    // Ensure valid PGP public key and private key passed
    if (!pub || !priv) {
      this.showModalError('Missing or invalid details')
      return
    }

    ipcRenderer
      .invoke('import-pgp', {
        passphrase,
        publicKeyArmored: pub[0],
        privateKeyArmored: priv[0]
      })
      .then(() => this.closeModals())
      .catch(error => this.showModalError(friendlyError(error)))
  }

  // Handles creating a new PGP key
  createIdentityHandler (params) {
    // Check if all required params supplied
    if (!params.name || !params.passphrase || !params.algo) {
      this.showModalError('Missing details')
      return
    }
    // Remove email if not supplied
    if (!params.email) delete params.email
    this.showModalMessage('Generating keys...')

    ipcRenderer
      .invoke('create-pgp', params)
      .then(() => this.closeModals())
      .catch(error => this.showModalError(friendlyError(error)))
  }

  // Handles composing new chats
  composeChatHandler (id) {
    // Validate id
    let [ciphoraId] = id.match(CIPHORA_ID_REGEX) || []
    let [publicKey] = id.match(PUBLIC_KEY_REGEX) || []

    // Ensure id is either a valid CiphoraId or PGP public key
    if (!ciphoraId && !publicKey) {
      notifications.show('Invalid CiphoraId or PGP key', 'error', true, 3000)
      return
    }

    // TODO: replace with progress bar under compose
    // Show persistent composing notification
    notifications.show('Composing chat...', null, false)

    ipcRenderer.send('add-chat', ciphoraId, publicKey)
  }

  // Creates a new chat placeholder for the chat the user is composing
  createComposeChat () {
    // Already composing
    if (this.state.composing) return
    const id = COMPOSE_CHAT_ID
    // Create a dummy chat
    let chats = {}
    chats[id] = {
      id,
      name: 'New Chat',
      messages: []
    }
    // Add to the front
    chats = { ...chats, ...this.state.chats }
    this.setState({ composing: true, chats, activeChatId: id })
  }

  // Deletes the new chat placeholder
  deleteComposeChat () {
    let { chats } = this.state
    delete chats[COMPOSE_CHAT_ID]
    const nextChat = Object.values(chats)[0]
    const activeChatId = nextChat ? nextChat.id : ''
    this.setState({ composing: false, chats, activeChatId })
  }

  // Handles chat deletion
  deleteChatHandler (id) {
    if (id === COMPOSE_CHAT_ID) {
      this.deleteComposeChat()
      return
    }
    ipcRenderer.send('delete-chat', id)
  }

  // Handles sending a message
  composeMessageHandler (message) {
    // Ensure message is not empty
    if (!message || !WORDS_REGEX.test(message)) return

    ipcRenderer.send(
      'send-message',
      CONTENT_TYPES.TEXT,
      message,
      this.state.activeChatId
    )
  }

  // Handles sending a file
  async sendFileHandler (type) {
    const title = `Select the ${type} to send`
    // Filter based on type selected
    const filters = FILTERS[type]
    const { canceled, filePaths } = await dialog.showOpenDialog(
      remote.getCurrentWindow(),
      {
        properties: ['openFile'],
        title,
        filters
      }
    )
    // Ignore if user cancelled
    if (canceled || !filePaths) return
    console.log(filters, filePaths)
    ipcRenderer.send(
      'send-message',
      type,
      filePaths[0],
      this.state.activeChatId
    )
  }

  // Render the App UI
  render () {
    const activeChat =
      this.state.activeChatId && this.state.chats[this.state.activeChatId]
    return (
      <div className='App'>
        <SetupIdentityModal
          open={this.state.setupIdentity}
          onImportIdentityClick={() => this.openModal('importIdentity')}
          onCreateIdentityClick={() => this.openModal('createIdentity')}
        />
        <ImportIdentityModal
          open={this.state.importIdentity}
          onClose={() => this.openModal('setupIdentity')}
          onImportClick={this.importIdentityHandler}
          message={this.state.modalMessage}
        />
        <CreateIdentityModal
          open={this.state.createIdentity}
          onClose={() => this.openModal('setupIdentity')}
          onCreateClick={this.createIdentityHandler}
          message={this.state.modalMessage}
        />
        <Messenger
          sidebar={
            <ChatList
              profile={this.state.profile}
              chats={Object.values(this.state.chats)}
              activeChatId={this.state.activeChatId}
              onChatClick={this.activateChat}
              onComposeChatClick={this.createComposeChat}
              onDeleteClick={this.deleteChatHandler}
              onCopyIdClick={() => clipboard.writeText(this.state.profile.id)}
              onCopyPGPClick={() => ipcRenderer.send('copy-pgp')}
            />
          }
          content={
            <MessageList
              composing={this.state.composing}
              onComposeChat={this.composeChatHandler}
              activeChatId={this.state.activeChatId}
              chat={activeChat}
              onComposeMessage={this.composeMessageHandler}
              onSendFileClick={this.sendFileHandler}
              onFileClick={filePath => shell.openItem(filePath)}
              onLinkClick={url => shell.openExternal(url)}
              onDeleteClick={this.deleteChatHandler}
              onCopyIdClick={() => clipboard.writeText(this.state.activeChatId)}
              onCopyPGPClick={() =>
                ipcRenderer.send('copy-pgp', this.state.activeChatId)
              }
            />
          }
        />
      </div>
    )
  }
}
