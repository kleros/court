import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Divider, Popover, Tooltip } from "antd";
import isImage from "is-image";
import isTextPath from "is-text-path";
import isVideo from "is-video";
import { ReactComponent as Document } from "../assets/images/document.svg";
import { ReactComponent as Image } from "../assets/images/image.svg";
import { ReactComponent as Link } from "../assets/images/link.svg";
import { ReactComponent as PDF } from "../assets/images/pdf.svg";
import { ReactComponent as Video } from "../assets/images/video.svg";
import { isSafeNavigationUrl } from "../utils/urlValidation";
import { isContentAddressed, toHttpUrl } from "../utils/ipfs";

const StyledPopover = styled(({ className, ...rest }) => (
  <Popover className={className} overlayClassName={className} {...rest} />
))`
  .ant-popover {
    &-inner {
      border: 1px solid ${({ theme }) => theme.primaryPurple};
    }

    &-title {
      color: ${({ theme }) => theme.primaryPurple};
    }
  }
`;
const StyledIFrame = styled.iframe`
  height: 400px;
  margin-top: -8px;
  width: 300px;
`;
const DisabledAttachment = styled.span`
  cursor: not-allowed;
  display: inline-flex;
  opacity: 0.5;
`;

const isPDF = (extension) => extension.toLowerCase() === ".pdf";

const Attachment = ({ URI, description, extension: _extension, previewURI, title }) => {
  let extension;
  if (!_extension && URI) extension = `.${URI.split(".").pop()}`;
  else extension = `.${_extension}`;
  if (!URI) return null;
  let Component;
  if (isPDF(extension)) Component = PDF;
  else if (isTextPath(extension)) Component = Document;
  else if (isImage(extension)) Component = Image;
  else if (isVideo(extension)) Component = Video;
  else Component = Link;
  Component = <Component className="primary-purple-fill theme-fill" />;

  const href = toHttpUrl(URI);

  //A rejected attachment still indicates that a file was attached,
  //but renders as a disabled, non-clickable icon with an explanation.
  if (!isContentAddressed(URI) || !isSafeNavigationUrl(href)) {
    return (
      <Tooltip
        overlayStyle={{ wordBreak: "break-all" }}
        title={`This attachment link was flagged as unsafe and has been disabled: "${href}"`}
      >
        <DisabledAttachment>{Component}</DisabledAttachment>
      </Tooltip>
    );
  }

  const LinkedComponent = (
    <a href={href} rel="noopener noreferrer" target="_blank">
      {Component}
    </a>
  );

  // No popover
  if (!title && !description) {
    return LinkedComponent;
  }

  return (
    <StyledPopover
      arrowPointAtCenter
      className=""
      content={
        previewURI ? (
          <>
            {description}
            <Divider dashed />
            <StyledIFrame sandbox="" frameBorder="0" src={previewURI} title="Attachment Preview" />
          </>
        ) : (
          description
        )
      }
      title={title}
    >
      {LinkedComponent}
    </StyledPopover>
  );
};

Attachment.propTypes = {
  URI: t.string,
  description: t.string,
  extension: t.string,
  previewURI: t.string,
  title: t.string,
};

Attachment.defaultProps = {
  URI: null,
  extension: null,
  previewURI: null,
};

export default Attachment;
