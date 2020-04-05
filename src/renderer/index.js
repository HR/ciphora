import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'
import { NotificationProvider } from './lib/notifications'
import { ipcRenderer } from 'electron'
import { darkMode } from 'electron-util'

if (darkMode.isEnabled) {
  document.body.classList.add('theme-dark')
} else {
  document.body.classList.add('theme-light')
}

const app = ReactDOM.render(
  <NotificationProvider>
    <App />
  </NotificationProvider>,
  document.getElementById('app')
)
