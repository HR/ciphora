import React, { useState } from 'react'
import Modal from './Modal'

const pgpExample = `-----BEGIN PGP PUBLIC KEY BLOCK-----

mQENBFwFqjEBCAC9ZM3rjdJHmm+hOkuAQ...............................
..........................5C1n16MW5bvac4QSY/jhw08sRjLed3Q===7MVT
-----END PGP PUBLIC KEY BLOCK-----

-----BEGIN PGP PRIVATE KEY BLOCK-----

X4doIG+e00kZncAFqeJcMy3ijjvjKypDGU2j............................
..........GQRxAiHPLFsBr1ASV9B688YRyAf9WDJSEwfXG4eEw1/Rt99XBrm1c6
-----END PGP PRIVATE KEY BLOCK-----`

export default function ImportIdentityModal (props) {
  const [keys, setKeys] = useState('')
  const [passphrase, setPassphrase] = useState('')

  return (
    <Modal
      header={
        <React.Fragment>
          <h1>Import your PGP key</h1>
          <p>Enter your passphrase, public and private keys below</p>
        </React.Fragment>
      }
      body={
        <React.Fragment>
          <textarea
            placeholder={pgpExample}
            value={keys}
            onChange={event => setKeys(event.target.value)}
            rows='6'
          ></textarea>
          <input
            type='password'
            placeholder='Passphrase (if set)'
            value={passphrase}
            onChange={event => setPassphrase(event.target.value)}
          ></input>
        </React.Fragment>
      }
      action={
        <button onClick={() => props.onImportClick({ keys, passphrase })}>
          Import
        </button>
      }
      {...props}
    />
  )
}
