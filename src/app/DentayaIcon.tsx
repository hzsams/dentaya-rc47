"use client";

import type { CSSProperties } from "react";

export type DentayaIconName =
  | "home"
  | "clinic"
  | "lab"
  | "patient"
  | "case"
  | "scan"
  | "design"
  | "finance"
  | "message"
  | "logistics"
  | "ai"
  | "settings"
  | "notification"
  | "team"
  | "guide"
  | "shield"
  | "calendar";

const paths: Record<DentayaIconName, string[]> = {
  home: ["M3 11.5 12 4l9 7.5", "M5.5 10.5V20h13v-9.5", "M9.5 20v-6h5v6"],
  clinic: ["M4 20h16V8H4v12Z", "M8 8V4h8v4", "M9 13h6", "M12 10v6"],
  lab: ["M9 3v5l-5 9a2 2 0 0 0 1.8 3h12.4A2 2 0 0 0 20 17l-5-9V3", "M8 13h8"],
  patient: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 21a8 8 0 0 1 16 0"],
  case: ["M4 7h16v13H4z", "M8 7V4h8v3", "M4 11h16"],
  scan: ["M4 8V5a1 1 0 0 1 1-1h3", "M16 4h3a1 1 0 0 1 1 1v3", "M20 16v3a1 1 0 0 1-1 1h-3", "M8 20H5a1 1 0 0 1-1-1v-3", "M7 12h10"],
  design: ["M5 19 19 5", "m14 5 2 2", "M4 14l6 6", "M7 11l6 6", "M14 4l6 6"],
  finance: ["M4 7h16v10H4z", "M8 11h8", "M8 14h5"],
  message: ["M4 5h16v11H8l-4 4V5Z", "M8 9h8", "M8 12h5"],
  logistics: ["M3 7h11v10H3z", "M14 10h4l3 3v4h-7z", "M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z", "M18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  ai: ["M12 3v3", "M12 18v3", "M3 12h3", "M18 12h3", "M6.2 6.2l2 2", "M15.8 15.8l2 2", "M17.8 6.2l-2 2", "M8.2 15.8l-2 2", "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"],
  settings: ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M4.5 12a7.5 7.5 0 0 1 .2-1.7L2.8 8.8l2-3.5 2.3.9A7.6 7.6 0 0 1 10 4.4L10.3 2h3.4l.3 2.4a7.6 7.6 0 0 1 2.9 1.8l2.3-.9 2 3.5-1.9 1.5a7.5 7.5 0 0 1 0 3.4l1.9 1.5-2 3.5-2.3-.9A7.6 7.6 0 0 1 14 19.6l-.3 2.4h-3.4l-.3-2.4a7.6 7.6 0 0 1-2.9-1.8l-2.3.9-2-3.5 1.9-1.5A7.5 7.5 0 0 1 4.5 12Z"],
  notification: ["M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5L6 17Z", "M10 20h4"],
  team: ["M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", "M16 10a2.5 2.5 0 1 0 0-5", "M2.5 20a5.5 5.5 0 0 1 11 0", "M13.5 15a5 5 0 0 1 8 5"],
  guide: ["M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z", "M8 8h7", "M8 12h7", "M8 16h4"],
  shield: ["M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z", "m9 12 2 2 4-4"],
  calendar: ["M5 4h14v16H5z", "M8 2v4", "M16 2v4", "M5 9h14"],
};

export default function DentayaIcon({
  name,
  size = 20,
  style,
}: {
  name: DentayaIconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "0 0 auto", ...style }}
    >
      {paths[name].map((d, index) => (
        <path key={`${name}-${index}`} d={d} />
      ))}
    </svg>
  );
}
