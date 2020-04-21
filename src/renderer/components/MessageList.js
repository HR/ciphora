import { ipcRenderer } from 'electron'
import React, { useEffect, useState, useRef } from 'react'
import Compose from './Compose'
import Toolbar from './Toolbar'
import {
  ToolbarButton,
  ToolbarDropdownButton,
  ToolbarDropdownItem
} from './ToolbarButtons'
import Message from './Message'
import { CONTENT_TYPES } from '../../consts'
import moment from 'moment'

export default function MessageList (props) {
  const [message, setMessage] = useState('')
  const [id, setId] = useState('')
  const [infoDropdownActive, setInfoDropdownActive] = useState(false)
  const messagesEndRef = useRef(null)

  // Scrolls to the bottom
  function scrollToBottom () {
    messagesEndRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }

  // Scroll to the bottom everytime a new message is sent/received to show it
  useEffect(scrollToBottom, [props.chat])

  // Handles copy User ID to clipboard request
  function onCopyUserIdClick () {
    setInfoDropdownActive(false)
    ipcRenderer.send('copy-user-id', props.chat.id.toUpperCase())
  }

  // Handles copy PGP key to clipboard request
  function onCopyPGPClick () {
    setInfoDropdownActive(false)
    ipcRenderer.send('copy-pgp', props.activeChatId)
  }

  // Handles copy PGP key to clipboard request
  function onDeleteChatClick () {
    setInfoDropdownActive(false)
    props.onDeleteChat(props.chat.id)
  }

  // Invokes the passed function (fn) when enter press detected
  function onEnterPress (fn) {
    return event => {
      if (event.key === 'Enter') {
        fn()
      }
    }
  }

  // Dynamically generates the message list for the UI from the actual list
  function renderMessages () {
    const { messages, id } = props.chat

    let messageList = []

    for (let i = 0; i < messages.length; i++) {
      let previous = messages[i - 1]
      let current = messages[i]
      let next = messages[i + 1]
      let isMine = current.sender !== id
      let currentMoment = moment(current.timestamp)
      let prevBySameSender = false
      let nextBySameSender = false
      let startsSequence = true
      let endsSequence = true
      let showTimestamp = true

      if (previous) {
        let previousMoment = moment(previous.timestamp)
        let previousDuration = moment.duration(
          currentMoment.diff(previousMoment)
        )
        prevBySameSender = previous.sender === current.sender

        if (prevBySameSender && previousDuration.as('hours') < 1) {
          startsSequence = false
        }

        if (previousDuration.as('hours') < 1) {
          showTimestamp = false
        }
      }

      if (next) {
        let nextMoment = moment(next.timestamp)
        let nextDuration = moment.duration(nextMoment.diff(currentMoment))
        nextBySameSender = next.sender === current.sender

        if (nextBySameSender && nextDuration.as('hours') < 1) {
          endsSequence = false
        }
      }

      messageList.push(
        <Message
          key={i}
          isMine={isMine}
          startsSequence={startsSequence}
          endsSequence={endsSequence}
          showTimestamp={showTimestamp}
          message={current}
          onLoad={scrollToBottom}
          onFileClick={props.onFileClick}
          onLinkClick={props.onLinkClick}
        />
      )
    }

    return messageList
  }

  let toolbar = (
    <Toolbar
      title={props.chat ? props.chat.name : ''}
      rightItems={
        props.chat && (
          <ToolbarDropdownButton
            key='info'
            icon='ion-ios-information-circle-outline'
            active={infoDropdownActive}
            setActive={setInfoDropdownActive}
          >
            <div className='userid-area'>
              <span>User ID:</span>
              <input
                className='userid-input'
                type='text'
                readOnly
                value={props.chat.id.toUpperCase()}
              />
            </div>
            <ToolbarDropdownItem onClick={onCopyUserIdClick}>
              Copy User ID
            </ToolbarDropdownItem>
            <ToolbarDropdownItem onClick={onCopyPGPClick}>
              Copy PGP Key
            </ToolbarDropdownItem>
            <ToolbarDropdownItem onClick={onDeleteChatClick}>
              Delete Chat
            </ToolbarDropdownItem>
          </ToolbarDropdownButton>
        )
      }
    />
  )

  let placeholder = props.chat
    ? 'Type a message'
    : 'Compose a new chat to start messaging'

  if (props.composing) {
    toolbar = (
      <Toolbar
        leftItems={
          <div className='compose-chat'>
            <span>To: </span>
            <div className='compose-input-area'>
              <input
                autoFocus
                type='text'
                className='compose-input'
                placeholder={'Enter a User ID or PGP Key'}
                value={id}
                onChange={event => setId(event.target.value)}
                onKeyDown={onEnterPress(() => props.onComposeChat(id))}
                onPaste={event => {
                  props.onComposeChat(event.clipboardData.getData('text/plain'))
                }}
              />
            </div>
          </div>
        }
      />
    )

    placeholder = 'Add the recipient to start messaging'
  }

  // Render UI
  var messageListClasses = ['message-list', props.composing ? ' composing' : '']
  return (
    <div className={messageListClasses.join(' ')}>
      {toolbar}

      <div className='message-list-container'>
        {!props.composing && props.chat && renderMessages()}
      </div>

      <Compose
        disabled={props.composing || !props.chat}
        placeholder={placeholder}
        value={message}
        onChange={event => setMessage(event.target.value)}
        onKeyDown={onEnterPress(() => {
          // Send up
          props.onComposeMessage(message)
          // Clear message input
          setMessage('')
        })}
        rightitems={[
          <ToolbarButton
            onClick={() => props.onSendFileClick(CONTENT_TYPES.IMAGE)}
            key='image'
            icon='ion-ios-image'
          />,
          <ToolbarButton
            onClick={() => props.onSendFileClick(CONTENT_TYPES.FILE)}
            key='file'
            icon='ion-ios-document'
          />
        ]}
      />
      <div ref={messagesEndRef} />
    </div>
  )
}
