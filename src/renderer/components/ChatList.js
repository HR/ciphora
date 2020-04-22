import React from 'react'
import Chat from './Chat'
import Toolbar, { ToolbarButton } from './Toolbar'
import {
  ToolbarDropdownButton,
  ToolbarDropdownItem,
  ToolbarDropdownUserInfo
} from './ToolbarDropdown'
import { isEmpty } from '../lib/util'

export default function ChatList (props) {
  // Set to last message there is one otherwise nothing
  function getLastMessage (chat) {
    return chat.messages.length && chat.messages[chat.messages.length - 1]
  }

  const toolbarItems = [
    <ToolbarButton
      key='create'
      icon='ion-ios-create'
      onClick={props.onComposeChatClick}
    />
  ]

  if (!isEmpty(props.profile)) {
    toolbarItems.push(
      <ToolbarDropdownButton key='profile' icon='ion-ios-contact'>
        <ToolbarDropdownUserInfo
          name={props.profile.name}
          id={props.profile.id}
        />
        <ToolbarDropdownItem onClick={props.onCopyIdClick}>
          Copy User ID
        </ToolbarDropdownItem>
        <ToolbarDropdownItem onClick={props.onCopyPGPClick}>
          Copy PGP Key
        </ToolbarDropdownItem>
      </ToolbarDropdownButton>
    )
  }

  // Render UI
  return (
    <div className='chat-list'>
      <Toolbar rightItems={toolbarItems} />
      {/*<ChatSearch />*/}
      {!!props.chats &&
        props.chats.map(chat => (
          <Chat
            active={chat.id === props.activeChatId}
            onDeleteClick={() => props.onDeleteClick(chat.id)}
            onClick={() => props.onChatClick(chat.id)}
            id={chat.id}
            key={chat.id}
            name={chat.name}
            isOnline={chat.online}
            lastMessage={getLastMessage(chat)}
          />
        ))}
    </div>
  )
}
