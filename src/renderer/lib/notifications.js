import React from 'react'
import { hashCode } from './util'
const Ctx = React.createContext()

/**
 * Components
 *****************************/

const NotificationContainer = props => (
  <div className='notification-container' {...props} />
)
const Notification = ({ children, type, onDismiss, dismissable }) => (
  <div
    className={`notification ${type}`}
    onClick={dismissable ? onDismiss : undefined}
  >
    {children}
    {dismissable && <span className='dismiss ion-md-close' />}
  </div>
)

/**
 * Provider
 *****************************/

export function NotificationProvider ({ children }) {
  const [notifications, setNotifications] = React.useState([])

  // Dismiss a notification
  const dismiss = id => {
    const newNotifications = notifications.filter(n => n.id !== id)
    setNotifications(newNotifications)
  }

  // Dismiss
  const onDismiss = id => () => dismiss(id)

  // Clears all notifications
  const clear = () => {
    setNotifications([])
  }

  // Show a notification
  const show = (content, type, dismissable = true, duration) => {
    type = type || ''
    const id = hashCode(content)
    const notification = { id, type, content, dismissable }
    setNotifications(notifications => {
      const alreadyShowing = notifications.find(n => n.id == id)
      // Do not show if already showing
      return alreadyShowing ? notifications : [notification, ...notifications]
    })

    // Dismiss after duration if specified
    if (duration) setTimeout(onDismiss(id), duration)
  }

  return (
    <Ctx.Provider value={{ show, dismiss, clear }}>
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
