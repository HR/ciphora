import React from 'react'

export default function ToolbarButton (props) {
  return <i className={`toolbar-button ${props.icon}`} {...props} />
}
