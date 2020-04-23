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

// Switches the UI theme between light and dark
function switchTheme () {
  isDarkMode = !isDarkMode
  setTheme()
}

// Add a shortcut to switch themes
window.onkeyup = function (e) {
  // ctrl + t
  if (e.ctrlKey && e.key === 't') {
    switchTheme()
  }
}

// Set theme accordingly
setTheme()

// Render the entire UI
ReactDOM.render(
  <NotificationProvider>
    <App />
  </NotificationProvider>,
  document.getElementById('app')
)
