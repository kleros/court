import { useMemo } from "react";
import { useLocation } from "react-router-dom";

export default function useQueryParams() {
  const { search } = useLocation();

  return useMemo(() => Object.fromEntries(new URLSearchParams(search).entries()), [search]);
}
