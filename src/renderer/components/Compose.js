import React from 'react'

export default function Compose (props) {
  return (
    <div className='compose'>
      <input type='text' className='compose-input' {...props} />
      <div className='actions'>{props.rightitems}</div>
    </div>
  )
}
