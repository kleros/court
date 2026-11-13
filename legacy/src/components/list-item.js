import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { List } from "antd";

const StyledListItem = styled(List.Item)`
  color: ${({ theme }) => theme.textPrimary};
  font-weight: bold;
  padding-left: 19px;
  padding-right: 19px;
  position: relative;

  display: flex;
  gap: 16px;

  ::last-child {
    margin-left: auto;
  }
`;

const ListItem = ({ children, extra, ...rest }) => (
  <StyledListItem extra={<div>{extra}</div>} {...rest}>
    <div>{children}</div>
  </StyledListItem>
);

ListItem.propTypes = {
  children: t.node,
  extra: t.node,
};

export default ListItem;
