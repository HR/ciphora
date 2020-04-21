import React from 'react'
import Modal from './Modal'

export default function SetupIdentityModal (props) {
  return (
    <Modal
      className='setup-identity-modal'
      header={
        <React.Fragment>
          <i className='ion-ios-contact' />
          <h1>Setup your identity</h1>
          <p>All you need to start messaging is a PGP key</p>
        </React.Fragment>
      }
      body={
        <React.Fragment>
          <button onClick={props.onImportIdentityClick}>Import PGP key</button>
          <hr className='divider' />
          <button onClick={props.onCreateIdentityClick}>Create PGP key</button>
        </React.Fragment>
      }
      {...props}
    />
  )
}
