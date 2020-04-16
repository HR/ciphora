import React from 'react'
import Modal from './Modal'

export default function ChatInfoModal (props) {
  const { chat } = props
  return chat ? (
    <Modal
      className='chat-info-modal'
      style={{ width: 420, minHeight: 240 }}
      header={
        <React.Fragment>
          <h1>{chat.name}</h1>
          {chat.email && <p>{chat.email}</p>}
        </React.Fragment>
      }
      body={
        <React.Fragment>
          <strong>User information</strong>
          <div className='userid-area'>
            <span>User ID:</span>
            <input className='userid-input' type='text' readOnly value={chat.id.toUpperCase()} />
          </div>
          <div className='copy-buttons'>
            <button onClick={props.onCopyUserIdClick}>Copy User ID</button>
            <button onClick={props.onCopyPGPClick}>Copy PGP Key</button>
          </div>
        </React.Fragment>
      }
      action={
        <React.Fragment>
          <button className='danger' onClick={props.onDeleteClick}>
            Delete Chat
          </button>
        </React.Fragment>
      }
      {...props}
    />
  ) : null
}
