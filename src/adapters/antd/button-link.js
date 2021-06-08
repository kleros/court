import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Button } from "antd";

/**
 * Attempt to tackle props passing issue.
 *
 * @see { @link https://github.com/ReactTraining/react-router/issues/6962 }
 */
export default function ButtonLinkAdapter({ children, className, ...props }) {
  const forwardedProps = pick(
    ["disabled", "ghost", "href", "htmlType", "icon", "loading", "shape", "size", "target", "type", "onClick", "block"],
    props
  );
  return (
    <StyledButton {...forwardedProps} className={className}>
      {children}
    </StyledButton>
  );
}

ButtonLinkAdapter.propTypes = {
  children: t.node,
  className: t.string,
};

const pick = (keys, obj) =>
  keys.reduce(
    (acc, key) => (Object.prototype.hasOwnProperty.call(obj, key) ? Object.assign(acc, { [key]: obj[key] }) : acc),
    {}
  );

const StyledButton = styled(Button).attrs((props) => ({ ...props, type: "link" }))`
  &.ant-btn-link {
    padding-left: 0;
    padding-right: 0;
  }
`;
