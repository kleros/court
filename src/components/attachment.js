import { ReactComponent as Document } from '../assets/images/document.svg'
import { ReactComponent as Image } from '../assets/images/image.svg'
import { ReactComponent as Link } from '../assets/images/link.svg'
import { Popover } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import { ReactComponent as Video } from '../assets/images/video.svg'
import isImage from 'is-image'
import isTextPath from 'is-text-path'
import isVideo from 'is-video'
import styled from 'styled-components/macro'

const StyledPopover = styled(({ className, ...rest }) => (
  <Popover overlayClassName={className} {...rest} />
))`
  .ant-popover {
    &-inner {
      border: 1px solid;
    }

    &-title {
      color: inherit;
    }
  }
`
const Attachment = ({ URI, description, extension: _extension, title }) => {
  const extension = `.${_extension}`
  let Component
  if (isTextPath(extension)) Component = Document
  else if (isImage(extension)) Component = Image
  else if (isVideo(extension)) Component = Video
  else Component = Link
  return (
    <StyledPopover
      arrowPointAtCenter
      className="ternary-border-color theme-border-color ternary-color theme-color"
      content={description}
      title={title}
    >
      <a
        href={URI.replace(/^\/ipfs\//, 'https://ipfs.kleros.io/ipfs/')}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Component className="ternary-fill theme-fill" />
      </a>
    </StyledPopover>
  )
}

Attachment.propTypes = {
  URI: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  extension: PropTypes.string,
  title: PropTypes.string.isRequired
}

Attachment.defaultProps = {
  extension: null
}

export default Attachment
