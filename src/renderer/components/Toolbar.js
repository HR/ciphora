import React from 'react'

export function ToolbarButton (props) {
  return <i className={`toolbar-button ${props.icon}`} {...props} />
}

export default function Toolbar (props) {
  const { title, leftItems, rightItems } = props
  return (
    <div className='toolbar'>
      <div className='left-items'>{leftItems}</div>
      {title && <h1 className='toolbar-title'>{title}</h1>}
      {rightItems && <div className='right-items'>{rightItems}</div>}
    </div>
  )
}
