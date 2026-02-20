import React from "react";
import styled from "styled-components/macro";
import { Menu } from "antd";
import { useLocation, NavLink } from "react-router-dom";

const MenuItems = [
  <Menu.Item key="home">
    <NavLink to="/">Home</NavLink>
  </Menu.Item>,
  <Menu.Item key="courts">
    <NavLink to="/courts">Courts</NavLink>
  </Menu.Item>,
  <Menu.Item key="cases">
    <NavLink to="/cases">My Cases</NavLink>
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

function useMenuSelectKey() {
  const { pathname } = useLocation();
  if (pathname === "/") return "home";
  if (pathname === "/courts" || pathname.startsWith("/courts/")) return "courts";
  if (pathname === "/cases" || pathname.startsWith("/cases/")) return "cases";
  return null;
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
