import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { brand } from "@/lib/brand";
import { caseStudies, getCaseStudy } from "@/lib/case-studies";

export const alt = `${brand.name} industrial software project profile`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return caseStudies.map(({ slug }) => ({ slug }));
}

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const study = getCaseStudy((await params).slug);
  if (!study) notFound();
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#070a0f", color: "#f1f5f9", padding: "72px", border: "1px solid #1f2937" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22, letterSpacing: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="42" height="42" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="6" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
            <path d="M8 8L16 16V24" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M24 8L16 16" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="16" cy="16" r="2" fill="#22d3ee" />
            <circle cx="16" cy="24" r="1.5" fill="#f8fafc" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span>{brand.wordmark}<span style={{ color: "#22d3ee" }}>{brand.domainSuffix}</span></span>
            <span style={{ color: "#94a3b8", fontSize: 12, letterSpacing: 3 }}>{brand.descriptor.toUpperCase()}</span>
          </div>
        </div>
        <span style={{ color: "#67e8f9", fontSize: 18 }}>{study.status.toUpperCase()}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ color: "#22d3ee", fontSize: 18, letterSpacing: 5, textTransform: "uppercase" }}>PROJECT PROFILE {study.number} · {study.kicker}</span>
        <span style={{ marginTop: 28, maxWidth: 980, fontSize: 86, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>{study.title}</span>
        <span style={{ marginTop: 30, maxWidth: 920, color: "#94a3b8", fontSize: 28, lineHeight: 1.35 }}>{study.signal}</span>
      </div>
    </div>,
    size,
  );
}
