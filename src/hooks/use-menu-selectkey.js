import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function useMenuSelectkey() {
  let [selectKey, SetSelectKey] = useState("");
  let location = useLocation();

  useEffect(() => {
    let pathname = location.pathname;
    switch (pathname) {
      case "/courts":
        SetSelectKey("courts");
        break;
      case "/cases":
        SetSelectKey("cases");
        break;
      default:
        SetSelectKey("home");
        break;
    }
  }, [location]);

  return selectKey;
}
