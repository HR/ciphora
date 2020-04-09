import React from 'react'
import { basename } from 'path'
import moment from 'moment'
import { CONTENT_TYPES } from '../../consts'

const timeFormat = {
  sameDay: '[Today,] HH:mm',
  lastDay: '[Yesterday,] HH:mm',
  lastWeek: 'dddd [,] HH:mm',
  sameElse: 'dddd, D MMMM, YYYY HH:mm'
}

const LINK_REGEX = /^https?:/i
const SPACES_REGEX = /\s+/

export default function Message (props) {
  let contentRender = null
  const { message, isMine, startsSequence, endsSequence, showTimestamp } = props
  const { timestamp, contentType, content } = message
  const friendlyTimestamp = moment(timestamp).calendar(null, timeFormat)

  function parseText (text) {
    // Parse links
    return text.split(SPACES_REGEX).map((part, index) =>
      LINK_REGEX.test(part) ? (
        <a href='#' key={index} onClick={() => props.onLinkClick(part)}>
          {part}
        </a>
      ) : (
        ` ${part} `
      )
    )
  }

  switch (contentType) {
    case CONTENT_TYPES.IMAGE:
      // Render as image
      const imgSrc = `file:///${content}`
      contentRender = (
        <img
          className='bubble'
          onLoad={props.onLoad}
          title={friendlyTimestamp}
          src={imgSrc}
        />
      )
      break
    case CONTENT_TYPES.FILE:
      // Render as file
      const fileName = basename(content)
      const title = `${fileName} - ${friendlyTimestamp}`
      contentRender = (
        <div
          className='bubble file'
          title={title}
          onClick={() => props.onFileClick(content)}
        >
          <i className='ion-ios-document' />
          <br />
          {fileName}
        </div>
      )
      break
    default:
      // Render as text
      contentRender = (
        <div className='bubble' title={friendlyTimestamp}>
          {parseText(content)}
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
