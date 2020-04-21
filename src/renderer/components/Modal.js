import React from 'react'
import { classList } from '../lib/util'

export default function Modal (props) {
  return (
    <div
      className={classList({
        modal: true,
        'modal-active': props.open,
        [props.className]: props.className
      })}
    >
      <div
        className='modal-cover'
        onClick={props.onClose ? props.onClose : undefined}
      ></div>

      <div className='modal-outer-container'>
        <div className='modal-inner-container' style={{ ...props.style }}>
          {!!props.onClose && (
            <a className='ion-ios-close cancel' onClick={props.onClose} />
          )}
          <div className='modal-header'>{props.header}</div>
          <div className='modal-body'>
            {props.body}
            {!!props.message && !!props.message.text && (
              <p className={props.message.error ? 'error-message' : 'message'}>
                {props.message.text}
              </p>
            )}
          </div>

          {!!props.action && <div className='modal-action'>{props.action}</div>}
        </div>
      </div>
    </div>
  )
}
