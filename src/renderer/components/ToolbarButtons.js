import React from 'react'
import { classList } from '../lib/util'

export function ToolbarButton (props) {
  return <i className={`toolbar-button ${props.icon}`} {...props} />
}

export function ToolbarDropdownButton (props) {
  return (
    <div
      className={classList({
        'toolbar-dropdown-button': true,
        active: props.active
      })}
    >
      <i
        className={`toolbar-button ${props.icon}`}
        onClick={() => props.setActive(!props.active)}
      >
        {props.title}
      </i>
      <div className={'dropdown-body'}>{props.children}</div>
    </div>
  )
}

export function ToolbarDropdownItem (props) {
  return <div className='toolbar-dropdown-item' {...props} />
}
