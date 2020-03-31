import React from 'react'
import moment from 'moment'

const timeFormat = {
  sameDay: '[Today,] HH:mm',
  lastDay: '[Yesterday,] HH:mm',
  lastWeek: 'dddd [,] HH:mm',
  sameElse: 'dddd, D MMMM, YYYY HH:mm'
}

export default function Message (props) {
  const { data, isMine, startsSequence, endsSequence, showTimestamp } = props

  const friendlyTimestamp = moment(data.timestamp).calendar(null, timeFormat)
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

      <div className='bubble-container'>
        <div className='bubble' title={friendlyTimestamp}>
          {data.content}
        </div>
      </div>
    </div>
  )
}
