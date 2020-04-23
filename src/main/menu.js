'use strict'
const path = require('path')
const { app, Menu, shell } = require('electron')
const {
  is,
  appMenu,
  aboutMenuItem,
  openUrlMenuItem,
  openNewGitHubIssue,
  debugInfo
} = require('electron-util')

const showPreferences = () => {
  // Show the app's preferences here
}

const helpSubmenu = [
  openUrlMenuItem({
    label: 'Website',
    url: 'https://github.com/hr/ciphora'
  }),
  openUrlMenuItem({
    label: 'Source Code',
    url: 'https://github.com/hr/ciphora'
  }),
  {
    label: 'Report an Issue…',
    click () {
      const body = `
<!-- Please succinctly describe your issue and steps to reproduce it. -->


---

${debugInfo()}`

      openNewGitHubIssue({
        user: 'hr',
        repo: 'ciphora',
        body
      })
    }
  }
]

if (!is.macos) {
  helpSubmenu.push(
    {
      type: 'separator'
    },
    aboutMenuItem({
      icon: path.join(__dirname, 'build', 'icon.png'),
      text: 'Created by Habib Rehman'
    })
  )
}

const debugSubmenu = [
  {
    label: 'Show App Data',
    click () {
      shell.openItem(app.getPath('userData'))
    }
  },
  {
    type: 'separator'
  },
  {
    label: 'Delete Chat Messages',
    click () {
      app.emit('delete-messages')
    }
  },
  {
    label: 'Delete App Data',
    click () {
      shell.moveItemToTrash(app.getPath('userData'))
      app.relaunch()
      app.quit()
    }
  }
]

const macosTemplate = [
  appMenu([
    {
      label: 'Preferences…',
      accelerator: 'Command+,',
      click () {
        showPreferences()
      }
    }
  ]),
  {
    role: 'fileMenu',
    submenu: [
      {
        label: 'New Message',
        click () {}
      },
      {
        type: 'separator'
      },
      {
        role: 'close'
      }
    ]
  },
  {
    role: 'editMenu'
  },
  {
    role: 'viewMenu'
  },
  {
    role: 'windowMenu'
  },
  {
    role: 'help',
    submenu: helpSubmenu
  }
]

// Linux and Windows
const otherTemplate = [
  {
    role: 'fileMenu',
    submenu: [
      {
        label: 'Custom'
      },
      {
        type: 'separator'
      },
      {
        label: 'Settings',
        accelerator: 'Control+,',
        click () {
          showPreferences()
        }
      },
      {
        type: 'separator'
      },
      {
        role: 'quit'
      }
    ]
  },
  {
    role: 'editMenu'
  },
  {
    role: 'viewMenu'
  },
  {
    role: 'help',
    submenu: helpSubmenu
  }
]

const template = process.platform === 'darwin' ? macosTemplate : otherTemplate

if (is.development) {
  template.push({
    label: 'Debug',
    submenu: debugSubmenu
  })
}

module.exports = Menu.buildFromTemplate(template)
