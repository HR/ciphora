import React, { useState } from 'react'
import Modal from './Modal'

const example = `-----BEGIN PGP PUBLIC KEY BLOCK-----

mQENBFwFqjEBCAC9ZM3rjdJHmm+hOkuAQ...............................
..........................5C1n16MW5bvac4QSY/jhw08sRjLed3Q===7MVT
-----END PGP PUBLIC KEY BLOCK-----
`

export default function AddModal (props) {
  const [id, setId] = useState('')

  return (
    <Modal
      header={
        <React.Fragment>
          <h1>Add Contact</h1>
          <p>Enter their public PGP key to start a new chat</p>
        </React.Fragment>
      }
      body={
        <React.Fragment>
          <textarea
            placeholder={example}
            value={id}
            onChange={event => setId(event.target.value)}
          ></textarea>
        </React.Fragment>
      }
      action={<button onClick={() => props.onAddClick(id)}>Add</button>}
      {...props}
    />
  )
}
