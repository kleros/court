import { useCallback, useEffect, useState } from "react";

//Alternative to `use-persisted-state` due to no key removal functionality.
export default function useLocalStorageString(key) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? "");

  useEffect(() => {
    setValue(localStorage.getItem(key) ?? "");
  }, [key]);

  const setAndStore = useCallback(
    (newValue) => {
      setValue(newValue);
      try {
        //If the value is empty or "", remove the key.
        if (newValue) localStorage.setItem(key, newValue);
        else localStorage.removeItem(key);
      } catch (err) {
        console.warn("Failed to store the value:", err);
      }
    },
    [key]
  );

  return [value, setAndStore];
}
