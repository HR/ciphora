import React from 'react'

export default function Compose (props) {
  return (
    <div className='compose'>
      <div className='compose-input-area'>
        <input type='text' className='compose-input' {...props} />
        {!props.disabled && <div className='actions'>{props.rightitems}</div>}
      </div>
    </div>
  )
}
