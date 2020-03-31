import React from 'react'
const Ctx = React.createContext()

/**
 * Components
 *****************************/

const NotificationContainer = props => (
  <div className='notification-container' {...props} />
)
const Notification = ({ children, type, onDismiss }) => (
  <div className={`notification ${type}`} onClick={onDismiss}>
    {children}
    <span className='chat-delete ion-md-close' />
  </div>
)

/**
 * Provider
 *****************************/
let notificationCount = 0

export function NotificationProvider ({ children }) {
  const [notifications, setNotifications] = React.useState([])

  // Show a notification
  const show = (content, type = '') => {
    const id = notificationCount++
    const notification = { id, type, content }
    setNotifications([...notifications, notification])
  }

  // Dismiss a notification
  const dismiss = id => {
    const newNotifications = notifications.filter(n => n.id !== id)
    setNotifications(newNotifications)
  }

  // Dismiss
  const onDismiss = id => () => dismiss(id)

  return (
    <Ctx.Provider value={{ show, dismiss }}>
      {children}
      <NotificationContainer>
        {notifications.map(({ content, id, ...rest }) => (
          <Notification key={id} onDismiss={onDismiss(id)} {...rest}>
            {content}
          </Notification>
        ))}
      </NotificationContainer>
    </Ctx.Provider>
  )
}

/**
 * Consumer
 *****************************/
export const useNotifications = isComponent =>
  isComponent ? Ctx : React.useContext(Ctx)
