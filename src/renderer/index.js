import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'
import { NotificationProvider } from './lib/notifications'
import { ipcRenderer } from 'electron'
import { darkMode } from 'electron-util'

if (darkMode.isEnabled) {
  document.documentElement.classList.add('dark')
}

const app = ReactDOM.render(
  <NotificationProvider>
    <App />
  </NotificationProvider>,
  document.getElementById('app')
)
