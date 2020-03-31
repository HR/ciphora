import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'
import { ipcRenderer } from 'electron'
import { darkMode } from 'electron-util'

if (darkMode.isEnabled) {
  document.documentElement.classList.add('dark')
}

const app = ReactDOM.render(<App />, document.getElementById('app'))
