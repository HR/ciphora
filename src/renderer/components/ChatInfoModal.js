import React from 'react'
import Modal from './Modal'

export default function ChatInfoModal (props) {
  const { chat } = props
  return chat ? (
    <Modal
      style={{ width: 420, minHeight: 240 }}
      header={
        <React.Fragment>
          <h1>{chat.name}</h1>
          {chat.email && <p>{chat.email}</p>}
          <p>
            <code>{chat.id.toUpperCase()}</code>
          </p>
        </React.Fragment>
      }
      action={
        <React.Fragment>
          <button onClick={props.onCopyPGPClick}>Copy PGP</button>
          <br />
          <br />
          <button className='danger' onClick={props.onDeleteClick}>
            Delete
          </button>
        </React.Fragment>
      }
      {...props}
    />
  ) : null
}
