import React, { useState } from 'react'
import { classList } from '../lib/util'

export function ToolbarDropdownButton (props) {
  const [infoDropdownActive, setInfoDropdownActive] = useState(false)

  return (
    <div
      className={classList({
        'toolbar-dropdown-button': true,
        active: infoDropdownActive
      })}
    >
      <i
        className={`toolbar-button ${props.icon}`}
        onClick={() => setInfoDropdownActive(!infoDropdownActive)}
      >
        {props.title}
      </i>
      <div
        className={'dropdown-body'}
        onClick={() => setInfoDropdownActive(false)}
      >
        {props.children}
      </div>
    </div>
  )
}

export function ToolbarDropdownUserInfo (props) {
  return (
    <div className='userid-area'>
      <span>{props.name}</span>
      <input
        className='userid-input'
        type='text'
        readOnly
        value={props.id.toUpperCase()}
      />
    </div>
  )
}

export function ToolbarDropdownItem (props) {
  return <div className='toolbar-dropdown-item' {...props} />
}
