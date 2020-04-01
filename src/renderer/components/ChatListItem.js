import React, { useEffect, useState } from 'react'
import shave from 'shave'
import moment from 'moment'
import { COMPOSE_CHAT_ID, CONTENT_TYPES } from '../../consts'

const timeFormat = {
  sameDay: 'HH:mm',
  lastDay: '[Yesterday]',
  lastWeek: 'dddd',
  sameElse: 'L'
}

function initialsise (name) {
  let iname = name.toUpperCase().split(' ')
  let initials = name[0]
  if (iname.length > 1) {
    initials += iname[iname.length - 1][0]
  }
  return initials
}

export default function ChatListItem (props) {
  const [deleteOpacity, setDeleteOpacity] = useState(0)

  useEffect(() => {
    shave('.chat-snippet', 20)
  })

  const { name, lastMessage, active } = props
  let content = null
  if (!lastMessage) {
    content = ''
  } else if (lastMessage.contentType === CONTENT_TYPES.TEXT) {
    // Text so show
    content = lastMessage.content
  } else {
    // File/image so show type
    content = `[${lastMessage.contentType}]`
  }

  const time = lastMessage
    ? moment(lastMessage.timestamp).calendar(null, timeFormat)
    : ''
  let listItemClass = 'chat-list-item'
  if (active) {
    listItemClass += ' chat-list-item-active'
  }

  return (
    <div
      className={listItemClass}
      onClick={props.onClick}
      onMouseEnter={() => setDeleteOpacity(1)}
      onMouseLeave={() => setDeleteOpacity(0)}
    >
      {/* <img className="chat-photo" src={photo} alt="chat" /> */}
      <div className='chat-initials' alt='chat'>
        {props.id === COMPOSE_CHAT_ID ? '' : initialsise(name)}
        {props.isOnline && <div className='chat-online'></div>}
      </div>
      <div className='chat-info'>
        <div className='chat-info-left'>
          <h1 className='chat-title'>{name}</h1>
          <p className='chat-snippet'>{content}</p>
        </div>
        <div className='chat-info-right'>
          <div className='chat-time'>{time}</div>
          <div
            style={{ opacity: deleteOpacity }}
            className='chat-delete ion-md-close'
            onClick={props.onDeleteClick}
          ></div>
        </div>
      </div>
    </div>
  )
}
