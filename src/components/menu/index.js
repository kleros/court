import React from "react";
import { Menu } from "antd";
import MenuItems from "./menuItems";
import useMenuSelectkey from "../../hooks/use-menu-selectkey";

const MenuMobile = () => {
  let selectKey = useMenuSelectkey();
  return (
    <Menu theme="dark" selectedKeys={[selectKey]}>
      {MenuItems()}
    </Menu>
  );
};

export default MenuMobile;
