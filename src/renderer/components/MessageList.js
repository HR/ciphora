import React, { useEffect, useState, useRef } from 'react'
import Compose from './Compose'
import Toolbar, { ToolbarButton } from './Toolbar'
import {
  ToolbarDropdownButton,
  ToolbarDropdownItem,
  ToolbarDropdownUserInfo
} from './ToolbarDropdown'
import Message from './Message'
import { classList } from '../lib/util'
import { CONTENT_TYPES } from '../../consts'
import moment from 'moment'

export default function MessageList (props) {
  const [message, setMessage] = useState('')
  const [id, setId] = useState('')

  const messagesEndRef = useRef(null)

  // Scrolls to the bottom
  function scrollToBottom () {
    messagesEndRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }

  // Scroll to the bottom everytime a new message is sent/received to show it
  useEffect(scrollToBottom, [props.chat])

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
          >
            <ToolbarDropdownUserInfo
              name={props.chat.name}
              id={props.chat.id}
            />
            <ToolbarDropdownItem onClick={props.onCopyIdClick}>
              Copy User ID
            </ToolbarDropdownItem>
            <ToolbarDropdownItem onClick={props.onCopyPGPClick}>
              Copy PGP Key
            </ToolbarDropdownItem>
            <ToolbarDropdownItem onClick={props.onDeleteClick}>
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

  return (
    <div
      className={classList({
        'message-list': true,
        composing: props.composing
      })}
    >
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
