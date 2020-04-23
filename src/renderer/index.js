import { ipcRenderer } from 'electron'
import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'
import { NotificationProvider } from './lib/notifications'
import { darkMode } from 'electron-util'
// Show dark mode if it is already enabled in the operating system
let isDarkMode = darkMode.isEnabled

// Sets the UI theme appropriately
function setTheme () {
  if (isDarkMode) {
    // Use dark theme
    document.body.classList.remove('theme-light')
    document.body.classList.add('theme-dark')
  } else {
    // Use light theme
    document.body.classList.remove('theme-dark')
    document.body.classList.add('theme-light')
  }
}

// When user toggles the theme
ipcRenderer.on('toggle-theme', event => {
  isDarkMode = !isDarkMode
  setTheme()
})

// Set theme accordingly
setTheme()

// Render the entire UI
ReactDOM.render(
  <NotificationProvider>
    <App />
  </NotificationProvider>,
  document.getElementById('app')
)
