import React from 'react'

export default function Modal (props) {
  const coverClass = props.open
    ? 'modal-cover modal-cover-active'
    : 'modal-cover'
  const containerClass = props.open
    ? 'modal-container modal-container-active'
    : 'modal-container'
  return (
    <div>
      <div className={containerClass} style={{ ...props.style }}>
        {!!props.onClose && (
          <a className='ion-ios-close cancel' onClick={props.onClose} />
        )}
        <div className='modal-header'>{props.header}</div>
        <div className='modal-body'>{props.body}</div>
        {!!props.message && !!props.message.text && (
          <p className={props.message.error ? 'error-message' : 'message'}>
            {props.message.text}
          </p>
        )}
        {!!props.action && <div className='modal-action'>{props.action}</div>}
      </div>

      <div
        className={coverClass}
        onClick={props.onClose ? props.onClose : undefined}
      ></div>
    </div>
  )
}
