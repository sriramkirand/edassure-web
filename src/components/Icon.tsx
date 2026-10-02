import type { SVGProps } from "react";

const PATHS = {
  check: "M5 12.5l4.5 4.5L19 7",
  x: "M6 6l12 12M18 6L6 18",
  alert: "M12 6v7M12 17.5v.5",
  half: "M12 4a8 8 0 100 16V4z",
  copy: "M9 9h10v10H9zM5 15V5h10",
  download: "M12 4v11m0 0l-4-4m4 4l4-4M5 19h14",
  plus: "M12 5v14M5 12h14",
  back: "M15 6l-6 6 6 6",
  moon: "M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z",
  sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z",
  file: "M7 3h7l4 4v14H7zM14 3v5h5",
  users: "M16 19v-1.5a3.5 3.5 0 00-3.5-3.5h-3A3.5 3.5 0 006 17.5V19M11 11a3 3 0 100-6 3 3 0 000 6z",
  shield: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  inbox: "M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
  upload: "M12 16V5m0 0l-4 4m4-4l4 4M5 19h14",
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...rest}><path d={PATHS[name]} /></svg>;
}
