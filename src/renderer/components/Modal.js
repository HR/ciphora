import React from 'react'

export default function Modal (props) {
  const modalClass = props.open
    ? 'modal modal-active ' + (props.className || '')
    : 'modal ' + (props.className || '')
  return (
    <div className={modalClass}>
      <div
        className="modal-cover"
        onClick={props.onClose ? props.onClose : undefined}
      ></div>
      
      <div className="modal-outer-container">
        <div className="modal-inner-container" style={{ ...props.style }}>
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
      </div>
    </div>
  )
}
