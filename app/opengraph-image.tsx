import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = `${brand.name} — ${brand.descriptor}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", background: "linear-gradient(135deg,#05080d 0%,#07131a 62%,#083044 100%)", color: "#f1f5f9", padding: "66px 72px", border: "1px solid #24303b" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="6" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
            <path d="M8 8L16 16V24" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 8L16 16" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="16" r="2" fill="#22d3ee" />
            <circle cx="16" cy="24" r="1.5" fill="#f8fafc" />
          </svg>
          <div style={{ display: "flex", alignItems: "center", fontSize: 24, fontWeight: 700, letterSpacing: 7 }}>{brand.wordmark}<span style={{ color: "#22d3ee" }}>{brand.domainSuffix}</span></div>
        </div>
        <div style={{ display: "flex", padding: "11px 16px", border: "1px solid #155e75", borderRadius: 999, color: "#67e8f9", fontSize: 14, letterSpacing: 3 }}>INDEPENDENT BUILDER</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 1040 }}>
        <div style={{ color: "#22d3ee", fontSize: 19, letterSpacing: 5, textTransform: "uppercase" }}>Industrial software + workflow automation</div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 68, fontWeight: 700, letterSpacing: -3, lineHeight: 1.03 }}>{brand.promise}</div>
        <div style={{ display: "flex", marginTop: 24, maxWidth: 920, color: "#a8b2c1", fontSize: 27, lineHeight: 1.35 }}>{brand.audienceLine}</div>
      </div>
      <div style={{ display: "flex", gap: 26, color: "#7dd3fc", fontSize: 14, letterSpacing: 3 }}>{brand.serviceSignals.map((signal, index) => <span key={signal} style={{ display: "flex", alignItems: "center", gap: 26 }}><span>{signal.toUpperCase()}</span>{index < brand.serviceSignals.length - 1 ? <span style={{ color: "#334155" }}>/</span> : null}</span>)}</div>
    </div>,
    size,
  );
}
