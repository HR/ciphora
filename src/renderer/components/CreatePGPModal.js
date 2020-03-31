import React, { useState } from 'react'
import Modal from './Modal'
import { PGP_KEY_ALGOS } from '../../consts'

export default function CreatePGPModal (props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [algo, setAlgo] = useState('')

  const gotGeneratedKey = !!props.message && !!props.message.longText

  const header = gotGeneratedKey ? (
    <React.Fragment>
      <h1>Your new PGP key</h1>
      <p>Save these details somewhere safe</p>
    </React.Fragment>
  ) : (
    <React.Fragment>
      <h1>Create a new PGP key</h1>
      <p>Enter your details below</p>
    </React.Fragment>
  )

  const body = gotGeneratedKey ? (
    <React.Fragment>
      <textarea disabled={true} value={props.message.longText}></textarea>
    </React.Fragment>
  ) : (
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
      <br />
      <select value={algo} onChange={event => setAlgo(event.target.value)}>
        <option value='' disabled='disabled' selected='selected'>
          Select your key algorithm
        </option>
        {PGP_KEY_ALGOS.map(algo => (
          <option key={algo} value={algo}>
            {algo.toUpperCase()}
          </option>
        ))}
      </select>
    </React.Fragment>
  )

  const action = gotGeneratedKey ? (
    <button onClick={() => props.onDoneClick()}>Done</button>
  ) : (
    <button
      onClick={() => props.onCreateClick({ name, passphrase, algo, email })}
    >
      Create
    </button>
  )

  return <Modal header={header} body={body} action={action} {...props} />
}
