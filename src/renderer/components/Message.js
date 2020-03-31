import React from 'react'
import moment from 'moment'

export default function Message (props) {
  const { data, isMine, startsSequence, endsSequence, showTimestamp } = props

  const friendlyTimestamp = moment(data.timestamp)
    .format('dddd, D MMMM  HH:mm')
    .toLocaleUpperCase()
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
