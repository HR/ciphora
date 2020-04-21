import React, { useState } from 'react'
import Modal from './Modal'
import { PGP_KEY_ALGOS } from '../../consts'

export default function CreateIdentityModal (props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [algo, setAlgo] = useState(PGP_KEY_ALGOS[0])

  return (
    <Modal
      header={
        <React.Fragment>
          <h1>Create a new PGP key</h1>
          <p>Enter your details below</p>
        </React.Fragment>
      }
      body={
        <React.Fragment>
          <input
            type='text'
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder='Name'
          ></input>
          <input
            type='email'
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder='Email (optional)'
          ></input>
          <input
            type='password'
            value={passphrase}
            onChange={event => setPassphrase(event.target.value)}
            placeholder='Passphrase'
          ></input>
          <select value={algo} onChange={event => setAlgo(event.target.value)}>
            {PGP_KEY_ALGOS.map(algo => (
              <option key={algo} value={algo}>
                {algo.toUpperCase()}
              </option>
            ))}
          </select>
        </React.Fragment>
      }
      action={
        <button
          onClick={() => props.onCreateClick({ name, passphrase, algo, email })}
        >
          Create
        </button>
      }
      {...props}
    />
  )
}
