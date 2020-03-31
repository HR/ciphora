import React from 'react'

export default function Messenger (props) {
  return (
    <div className='messenger'>
      <div className='scrollable sidebar'>{props.sidebar}</div>
      <div className='scrollable content'>{props.content}</div>
    </div>
  )
}
