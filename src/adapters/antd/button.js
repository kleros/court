import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { Button as AntdButton } from "antd";

/**
 * Attempt to tackle props passing issue.
 * @see { @link https://github.com/ReactTraining/react-router/issues/6962 }
 */

export function ButtonLink({ children, className, ...props }) {
  return (
    <StyledButtonLink {...getForwardedProps(props)} className={className}>
      {children}
    </StyledButtonLink>
  );
}

ButtonLink.propTypes = {
  children: t.node,
  className: t.string,
};

export function Button({ children, className, ...props }) {
  return (
    <StyledButton {...getForwardedProps(props)} className={className}>
      {children}
    </StyledButton>
  );
}

Button.propTypes = {
  children: t.node,
  className: t.string,
};

const pick = (keys) => (obj) =>
  keys.reduce(
    (acc, key) => (Object.prototype.hasOwnProperty.call(obj, key) ? Object.assign(acc, { [key]: obj[key] }) : acc),
    {}
  );

const getForwardedProps = pick([
  "disabled",
  "ghost",
  "href",
  "htmlType",
  "icon",
  "loading",
  "shape",
  "size",
  "target",
  "type",
  "onClick",
  "block",
]);

const StyledButtonLink = styled(AntdButton).attrs((props) => ({ ...props, type: "link" }))`
  &.ant-btn-link {
    padding-left: 0;
    padding-right: 0;
  }
`;

const StyledButton = styled(AntdButton).attrs((props) => ({ ...props }))``;
