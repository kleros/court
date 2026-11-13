import { useCallback, useState } from "react";

export default function useForceUpdate() {
  const [token, setToken] = useState(Math.random());
  const forceUpdate = useCallback(() => {
    setToken(Math.random());
  }, []);

  return [token, forceUpdate];
}
