import type { RouteObject } from "react-router";
import { APP_NAME } from "@court/core";

function Home() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-semibold">{APP_NAME}</h1>
    </main>
  );
}

function NotFound() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
    </main>
  );
}

/** Every route needs a matching header block in public/_headers (src/headers.test.ts). */
export const routes: RouteObject[] = [
  { path: "/", element: <Home /> },
  { path: "*", element: <NotFound /> },
];
