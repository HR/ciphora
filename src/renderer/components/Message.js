import React from 'react'
import moment from 'moment'
import { CONTENT_TYPES } from '../../consts'

const timeFormat = {
  sameDay: '[Today,] HH:mm',
  lastDay: '[Yesterday,] HH:mm',
  lastWeek: 'dddd [,] HH:mm',
  sameElse: 'dddd, D MMMM, YYYY HH:mm'
}

export default function Message (props) {
  let contentRender = null
  const { message, isMine, startsSequence, endsSequence, showTimestamp } = props
  const { timestamp, contentType, content, contentName } = message

  const friendlyTimestamp = moment(timestamp).calendar(null, timeFormat)

  switch (contentType) {
    case CONTENT_TYPES.IMAGE:
      // Render as image
      const ext = contentName.split('.')[1]
      const imgSrc = `data:image/${ext};base64, ${content}`
      contentRender = (
        <img className='bubble' title={friendlyTimestamp} src={imgSrc} />
      )
      break
    case CONTENT_TYPES.FILE:
      break
    default:
      // Render as text
      contentRender = (
        <div className='bubble' title={friendlyTimestamp}>
          {content}
        </div>
      )
  }

  return (
    <div
      className={[
        'message',
        `${isMine ? 'mine' : ''}`,
        `${startsSequence ? 'start' : ''}`,
        `${endsSequence ? 'end' : ''}`
      ].join(' ')}
    >
      {showTimestamp && <div className='timestamp'>{friendlyTimestamp}</div>}

      <div className='bubble-container'>{contentRender}</div>
    </div>
  )
}
