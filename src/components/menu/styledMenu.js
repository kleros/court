import React from "react";
import styled from "styled-components/macro";
import { Menu } from "antd";
import MenuItems from "./menuItems";
import useMenuSelectkey from "../../hooks/use-menu-selectkey";

const StyledMenu = styled(Menu)`
  font-weight: 500;
  line-height: 64px !important;
  text-align: center;

  &.ant-menu-dark {
    background-color: transparent;
  }

  && {
    .ant-menu-item > a {
      color: rgba(255, 255, 255, 0.85);

      &.hover,
      &.focus {
        color: rgba(255, 255, 255, 1);
      }
    }

    .ant-menu-item-selected {
      background-color: transparent !important;

      > a {
        color: rgba(255, 255, 255, 1);
      }
    }
  }
`;

const StyleMenu = () => {
  let selectKey = useMenuSelectkey();

  return (
    <StyledMenu mode="horizontal" theme="dark" selectedKeys={[selectKey]}>
      {MenuItems()}
    </StyledMenu>
  );
};

export default StyleMenu;
