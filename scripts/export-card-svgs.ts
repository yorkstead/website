import QRCode from "qrcode";
import fs from "fs";
import path from "path";

async function run() {
  const exportDir = "C:/Users/4twen/dev/yorkstead-systems/exports/business-cards";
  const artifactDir = "C:/Users/4twen/.gemini/antigravity/brain/e7a7db7d-a5ad-4212-bdd9-7ee3b166569c";
  fs.mkdirSync(exportDir, { recursive: true });

  const qrSvg = await QRCode.toString("https://yorkstead.com/connect?src=qr", {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0a0c0e",
      light: "#ffffff",
    },
  });

  // Extract inner paths from generated QR code
  const innerQr = qrSvg
    .replace(/<\?xml.*?\?>/, "")
    .replace(/<svg.*?>/, "")
    .replace("</svg>", "");

  // 1. FRONT SVG (Standard Trim 3.5in x 2.0in -> 1050 x 600)
  const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 600" width="3.5in" height="2.0in">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&amp;family=Geist+Mono:wght@400;500;600;700&amp;display=swap');
      .brand-wordmark { font-family: 'Geist Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace; font-size: 28px; font-weight: 700; letter-spacing: 0.22em; fill: #ffffff; }
      .brand-suffix { fill: #00c2de; }
      .tag-spec { font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 500; letter-spacing: 0.16em; fill: #5a6270; }
      .founder-name { font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 48px; font-weight: 700; letter-spacing: -0.02em; fill: #ffffff; }
      .founder-title { font-family: 'Geist Mono', monospace; font-size: 17px; font-weight: 500; letter-spacing: 0.08em; fill: #8a92a0; }
      .scope-line { font-family: 'Geist', sans-serif; font-size: 17px; font-weight: 500; letter-spacing: 0.02em; fill: #d1d5db; }
      .contact-line { font-family: 'Geist Mono', monospace; font-size: 16px; font-weight: 500; letter-spacing: 0.06em; fill: #8a92a0; }
      .cyan-dot { fill: #00c2de; }
    </style>
  </defs>

  <!-- Background Base -->
  <rect width="1050" height="600" fill="#0d0f12" />

  <!-- Subtle Precision Corner Crosshairs -->
  <path d="M 40 50 L 55 50 M 40 50 L 40 65" stroke="#1f242d" stroke-width="1.5" />
  <path d="M 1010 50 L 995 50 M 1010 50 L 1010 65" stroke="#1f242d" stroke-width="1.5" />
  <path d="M 40 550 L 55 550 M 40 550 L 40 535" stroke="#1f242d" stroke-width="1.5" />
  <path d="M 1010 550 L 995 550 M 1010 550 L 1010 535" stroke="#1f242d" stroke-width="1.5" />

  <!-- Header Lockup -->
  <g transform="translate(80, 100)">
    <text class="brand-wordmark">YORKSTEAD<tspan class="brand-suffix">.SYSTEMS</tspan></text>
  </g>
  <g transform="translate(970, 100)" text-anchor="end">
    <text class="tag-spec">SYS // OPS-2026</text>
  </g>

  <!-- Subtle Divider -->
  <line x1="80" y1="130" x2="970" y2="130" stroke="#1a1f26" stroke-width="1" />

  <!-- Center Identity -->
  <g transform="translate(80, 275)">
    <text class="founder-name">BRANDON YORK</text>
    <text y="40" class="founder-title">Founder &amp; Principal Systems Architect</text>
  </g>

  <!-- Bottom Details & Coordinates -->
  <g transform="translate(80, 480)">
    <text class="scope-line">Workflow Automation <tspan class="cyan-dot">•</tspan> Control Planes <tspan class="cyan-dot">•</tspan> Custom Systems</text>
    <text y="34" class="contact-line">brandon@yorkstead.com  <tspan class="cyan-dot">•</tspan>  ops.yorkstead.com</text>
  </g>
</svg>`;

  // 2. BACK SVG (Standard Trim 3.5in x 2.0in -> 1050 x 600)
  const backSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 600" width="3.5in" height="2.0in">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&amp;family=Geist+Mono:wght@400;500;600;700&amp;display=swap');
      .header-mono { font-family: 'Geist Mono', monospace; font-size: 16px; font-weight: 700; letter-spacing: 0.18em; fill: #00c2de; }
      .domain-white { font-family: 'Geist', sans-serif; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; fill: #ffffff; }
      .sector-title { font-family: 'Geist Mono', monospace; font-size: 17px; font-weight: 600; fill: #e2e8f0; }
      .bullet-cyan { fill: #00c2de; }
      .reticle-label { font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 600; letter-spacing: 0.2em; fill: #00c2de; }
      .footer-sub { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 500; letter-spacing: 0.12em; fill: #4b5563; }
    </style>
  </defs>

  <!-- Background Base -->
  <rect width="1050" height="600" fill="#0d0f12" />

  <!-- Left: QR Code Reticle Container -->
  <g transform="translate(80, 85)">
    <!-- Precision Crosshairs around QR -->
    <path d="M -15 0 L 10 0 M 0 -15 L 0 10" stroke="#00c2de" stroke-width="2" />
    <path d="M 365 0 L 340 0 M 350 -15 L 350 10" stroke="#00c2de" stroke-width="2" />
    <path d="M -15 350 L 10 350 M 0 365 L 0 340" stroke="#00c2de" stroke-width="2" />
    <path d="M 365 350 L 340 350 M 350 365 L 350 340" stroke="#00c2de" stroke-width="2" />

    <!-- QR Code Surface Background -->
    <rect x="15" y="15" width="320" height="320" rx="16" fill="#ffffff" />

    <!-- Embedded Real Scannable Vector QR Code -->
    <g transform="translate(25, 25) scale(9.677)">
      ${innerQr}
    </g>

    <!-- Reticle Sub-label -->
    <text x="175" y="390" text-anchor="middle" class="reticle-label">[ SCAN RETICLE ]</text>
  </g>

  <!-- Right: Sector Pathways & Information Architecture -->
  <g transform="translate(480, 115)">
    <!-- Header -->
    <text class="header-mono">OPERATIONAL GATEWAY //</text>
    <text y="38" class="domain-white">yorkstead.com/connect</text>

    <!-- Divider -->
    <line x1="0" y1="65" x2="480" y2="65" stroke="#1f242d" stroke-width="1.5" />

    <!-- Sectors List -->
    <g transform="translate(0, 115)">
      <circle cx="6" cy="0" r="4" class="bullet-cyan" />
      <text x="24" y="6" class="sector-title">Manufacturing &amp; Shopfloor Travelers</text>

      <circle cx="6" cy="50" r="4" class="bullet-cyan" />
      <text x="24" y="56" class="sector-title">Logistics, Fleet &amp; Multi-Site Dispatch</text>

      <circle cx="6" cy="100" r="4" class="bullet-cyan" />
      <text x="24" y="106" class="sector-title">Restaurant &amp; Kitchen Operations</text>

      <circle cx="6" cy="150" r="4" class="bullet-cyan" />
      <text x="24" y="156" class="sector-title">Custom Control Planes &amp; Internal ERPs</text>
    </g>

    <!-- Bottom Authority Mark -->
    <line x1="0" y1="320" x2="480" y2="320" stroke="#1f242d" stroke-width="1.5" />
    <text y="350" class="footer-sub">YORKSTEAD SYSTEMS • PURPOSE-BUILT OPERATIONAL SOFTWARE</text>
  </g>
</svg>`;

  // 3. FRONT SVG WITH BLEED (3.75in x 2.25in -> 1125 x 675, with 37.5px bleed margins)
  const frontBleedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1125 675" width="3.75in" height="2.25in">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&amp;family=Geist+Mono:wght@400;500;600;700&amp;display=swap');
      .brand-wordmark { font-family: 'Geist Mono', monospace; font-size: 28px; font-weight: 700; letter-spacing: 0.22em; fill: #ffffff; }
      .brand-suffix { fill: #00c2de; }
      .tag-spec { font-family: 'Geist Mono', monospace; font-size: 14px; font-weight: 500; letter-spacing: 0.16em; fill: #5a6270; }
      .founder-name { font-family: 'Geist', sans-serif; font-size: 48px; font-weight: 700; letter-spacing: -0.02em; fill: #ffffff; }
      .founder-title { font-family: 'Geist Mono', monospace; font-size: 17px; font-weight: 500; letter-spacing: 0.08em; fill: #8a92a0; }
      .scope-line { font-family: 'Geist', sans-serif; font-size: 17px; font-weight: 500; letter-spacing: 0.02em; fill: #d1d5db; }
      .contact-line { font-family: 'Geist Mono', monospace; font-size: 16px; font-weight: 500; letter-spacing: 0.06em; fill: #8a92a0; }
      .cyan-dot { fill: #00c2de; }
    </style>
  </defs>
  <rect width="1125" height="675" fill="#0d0f12" />
  <g transform="translate(37.5, 37.5)">
    <path d="M 40 50 L 55 50 M 40 50 L 40 65" stroke="#1f242d" stroke-width="1.5" />
    <path d="M 1010 50 L 995 50 M 1010 50 L 1010 65" stroke="#1f242d" stroke-width="1.5" />
    <path d="M 40 550 L 55 550 M 40 550 L 40 535" stroke="#1f242d" stroke-width="1.5" />
    <path d="M 1010 550 L 995 550 M 1010 550 L 1010 535" stroke="#1f242d" stroke-width="1.5" />
    <g transform="translate(80, 100)">
      <text class="brand-wordmark">YORKSTEAD<tspan class="brand-suffix">.SYSTEMS</tspan></text>
    </g>
    <g transform="translate(970, 100)" text-anchor="end">
      <text class="tag-spec">SYS // OPS-2026</text>
    </g>
    <line x1="80" y1="130" x2="970" y2="130" stroke="#1a1f26" stroke-width="1" />
    <g transform="translate(80, 275)">
      <text class="founder-name">BRANDON YORK</text>
      <text y="40" class="founder-title">Founder &amp; Principal Systems Architect</text>
    </g>
    <g transform="translate(80, 480)">
      <text class="scope-line">Workflow Automation <tspan class="cyan-dot">•</tspan> Control Planes <tspan class="cyan-dot">•</tspan> Custom Systems</text>
      <text y="34" class="contact-line">brandon@yorkstead.com  <tspan class="cyan-dot">•</tspan>  ops.yorkstead.com</text>
    </g>
  </g>
</svg>`;

  // 4. BACK SVG WITH BLEED (3.75in x 2.25in -> 1125 x 675, with 37.5px bleed margins)
  const backBleedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1125 675" width="3.75in" height="2.25in">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&amp;family=Geist+Mono:wght@400;500;600;700&amp;display=swap');
      .header-mono { font-family: 'Geist Mono', monospace; font-size: 16px; font-weight: 700; letter-spacing: 0.18em; fill: #00c2de; }
      .domain-white { font-family: 'Geist', sans-serif; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; fill: #ffffff; }
      .sector-title { font-family: 'Geist Mono', monospace; font-size: 17px; font-weight: 600; fill: #e2e8f0; }
      .bullet-cyan { fill: #00c2de; }
      .reticle-label { font-family: 'Geist Mono', monospace; font-size: 13px; font-weight: 600; letter-spacing: 0.2em; fill: #00c2de; }
      .footer-sub { font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 500; letter-spacing: 0.12em; fill: #4b5563; }
    </style>
  </defs>
  <rect width="1125" height="675" fill="#0d0f12" />
  <g transform="translate(37.5, 37.5)">
    <g transform="translate(80, 85)">
      <path d="M -15 0 L 10 0 M 0 -15 L 0 10" stroke="#00c2de" stroke-width="2" />
      <path d="M 365 0 L 340 0 M 350 -15 L 350 10" stroke="#00c2de" stroke-width="2" />
      <path d="M -15 350 L 10 350 M 0 365 L 0 340" stroke="#00c2de" stroke-width="2" />
      <path d="M 365 350 L 340 350 M 350 365 L 350 340" stroke="#00c2de" stroke-width="2" />
      <rect x="15" y="15" width="320" height="320" rx="16" fill="#ffffff" />
      <g transform="translate(25, 25) scale(9.677)">
        ${innerQr}
      </g>
      <text x="175" y="390" text-anchor="middle" class="reticle-label">[ SCAN RETICLE ]</text>
    </g>
    <g transform="translate(480, 115)">
      <text class="header-mono">OPERATIONAL GATEWAY //</text>
      <text y="38" class="domain-white">yorkstead.com/connect</text>
      <line x1="0" y1="65" x2="480" y2="65" stroke="#1f242d" stroke-width="1.5" />
      <g transform="translate(0, 115)">
        <circle cx="6" cy="0" r="4" class="bullet-cyan" />
        <text x="24" y="6" class="sector-title">Manufacturing &amp; Shopfloor Travelers</text>
        <circle cx="6" cy="50" r="4" class="bullet-cyan" />
        <text x="24" y="56" class="sector-title">Logistics, Fleet &amp; Multi-Site Dispatch</text>
        <circle cx="6" cy="100" r="4" class="bullet-cyan" />
        <text x="24" y="106" class="sector-title">Restaurant &amp; Kitchen Operations</text>
        <circle cx="6" cy="150" r="4" class="bullet-cyan" />
        <text x="24" y="156" class="sector-title">Custom Control Planes &amp; Internal ERPs</text>
      </g>
      <line x1="0" y1="320" x2="480" y2="320" stroke="#1f242d" stroke-width="1.5" />
      <text y="350" class="footer-sub">YORKSTEAD SYSTEMS • PURPOSE-BUILT OPERATIONAL SOFTWARE</text>
    </g>
  </g>
</svg>`;

  // Write files to exports
  fs.writeFileSync(path.join(exportDir, "yorkstead_card_front.svg"), frontSvg);
  fs.writeFileSync(path.join(exportDir, "yorkstead_card_back.svg"), backSvg);
  fs.writeFileSync(path.join(exportDir, "yorkstead_card_front_with_bleed.svg"), frontBleedSvg);
  fs.writeFileSync(path.join(exportDir, "yorkstead_card_back_with_bleed.svg"), backBleedSvg);

  // Also write to artifactDir for instant review
  fs.writeFileSync(path.join(artifactDir, "yorkstead_card_front.svg"), frontSvg);
  fs.writeFileSync(path.join(artifactDir, "yorkstead_card_back.svg"), backSvg);

  console.log("Successfully generated all 4 SVG files in " + exportDir);
}

run().catch(console.error);
