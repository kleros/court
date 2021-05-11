import React from "react";
import t from "prop-types";
import styled from "styled-components/macro";
import { List } from "antd";

const StyledListItem = styled(List.Item)`
  color: #4004a3;
  font-weight: bold;
  padding-left: 19px;
  padding-right: 19px;
  position: relative;

  .ant-list-item-extra {
    font-size: 18px;
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
  }
`;

const ListItem = ({ children, extra, ...rest }) => (
  <StyledListItem extra={extra} {...rest}>
    {children}
  </StyledListItem>
);

ListItem.propTypes = {
  children: t.node,
  extra: t.node,
};

export default ListItem;
