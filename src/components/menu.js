import React from "react";
import styled from "styled-components/macro";
import { Menu } from "antd";
import { useLocation } from "react-router-dom";
import { ChainNavLink } from "./chain-navigation";
import { splitChainPrefix } from "../helpers/chain-url";

const MenuItems = [
  <Menu.Item key="home">
    <ChainNavLink to="/">Home</ChainNavLink>
  </Menu.Item>,
  <Menu.Item key="courts">
    <ChainNavLink to="/courts">Courts</ChainNavLink>
  </Menu.Item>,
  <Menu.Item key="cases">
    <ChainNavLink to="/cases">My Cases</ChainNavLink>
  </Menu.Item>,
  <Menu.Item key="guide">
    <a
      href="https://blog.kleros.io/become-a-juror-blockchain-dispute-resolution-on-ethereum/"
      rel="noopener noreferrer"
      target="_blank"
    >
      Guide
    </a>
  </Menu.Item>,
];

//The selected item ignores the chain prefix: "/100/courts" selects Courts. "/100" has an empty rest, which is home.
export function menuKeyForPath(pathname) {
  const path = splitChainPrefix(pathname).rest || "/";
  if (path === "/") return "home";
  if (path === "/courts" || path.startsWith("/courts/")) return "courts";
  if (path === "/cases" || path.startsWith("/cases/")) return "cases";
  return null;
}

function useMenuSelectKey() {
  return menuKeyForPath(useLocation().pathname);
}

export function MobileMenu() {
  const selectedKey = useMenuSelectKey();

  return (
    <Menu selectedKeys={selectedKey ? [selectedKey] : []} theme="dark">
      {MenuItems}
    </Menu>
  );
}

const StyledDesktopMenu = styled(Menu)`
  flex: 1;
  font-weight: 500;
  line-height: 64px !important;
  text-align: center;
  border-bottom: none !important;
  justify-content: center;

  &.ant-menu-dark {
    background-color: transparent;
  }

  && {
    .ant-menu-item > a {
      color: ${({ theme }) => theme.textOnPurple}99;
      text-decoration: none;
      transition: color 0.2s ease;

      &:hover,
      &:focus {
        color: ${({ theme }) => theme.textOnPurple};
        text-decoration: none;
      }
    }

    .ant-menu-item-selected {
      background-color: transparent !important;

      > a {
        color: ${({ theme }) => theme.textOnPurple};
        text-decoration: none;
      }
    }
  }

  @media (max-width: 960px) {
    display: none;
  }
`;

export function DesktopMenu() {
  const selectedKey = useMenuSelectKey();

  return (
    <StyledDesktopMenu mode="horizontal" theme="dark" selectedKeys={selectedKey ? [selectedKey] : []}>
      {MenuItems}
    </StyledDesktopMenu>
  );
}
