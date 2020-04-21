import React from 'react'
import ChatListItem from './ChatListItem'
import Toolbar from './Toolbar'
import { ToolbarButton } from './ToolbarButtons'

export default function ChatList (props) {
  // Set to last message there is one otherwise nothing
  function getLastMessage (chat) {
    return chat.messages.length && chat.messages[chat.messages.length - 1]
  }
  // Render UI
  return (
    <div className='chat-list'>
      <Toolbar
        rightItems={[
          <ToolbarButton
            key='create'
            icon='ion-ios-create'
            onClick={props.onComposeChatClick}
          />
        ]}
      />
      {/*<ChatSearch />*/}
      {!!props.chats &&
        props.chats.map(chat => (
          <ChatListItem
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
