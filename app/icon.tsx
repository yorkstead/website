import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080e14",
        borderRadius: "96px",
        border: "16px solid #1e293b",
      }}
    >
      <svg
        width="360"
        height="360"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="32" height="32" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
        <path d="M8 8L16 16V24" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 8L16 16" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="2" fill="#22d3ee" />
        <circle cx="16" cy="24" r="1.5" fill="#f8fafc" />
      </svg>
    </div>,
    size,
  );
}
