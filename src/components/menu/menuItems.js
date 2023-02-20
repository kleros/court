import React from "react";
import { Menu } from "antd";
import { NavLink } from "react-router-dom";

const menuItems = () => {
  return [
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
};

export default menuItems;
