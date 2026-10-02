import { useEffect, useState } from "react";

export interface Route { path: string; query: URLSearchParams }
const read = (): Route => {
  const [path, qs] = (location.hash.slice(1) || "/").split("?");
  return { path: path || "/", query: new URLSearchParams(qs ?? "") };
};

export function useRoute(): Route {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const navigate = (path: string) => { location.hash = "#" + path; };
export const replaceRoute = (path: string) => history.replaceState(null, "", "#" + path);
