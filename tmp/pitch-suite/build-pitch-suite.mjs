import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "C:/Users/4twen/dev/yorkstead-website";
const OUT = path.join(ROOT, "outputs", "pitch-deck-suite");
const W = 1280, H = 720;
const C = { ink: "#0A0D12", muted: "#56606C", pale: "#EEF2F5", rule: "#BBC4CC", cyan: "#16B6D9", navy: "#082032", white: "#FFFFFF", orange: "#F97316", rose: "#E11D48", violet: "#7C3AED", green: "#179C66" };

const configs = [
  {
    file: "Yorkstead-Manufacturing-Systems-Pitch.pptx", sector: "MANUFACTURING", accent: C.cyan,
    title: "Keep production moving when the work changes.",
    subtitle: "Practical software for release control, shop-floor execution, inventory, quality, and the handoffs between them.",
    pain: ["Critical context lives across inboxes, folders, spreadsheets, and paper travelers.", "Revision changes reach the floor late—or without a clear owner.", "Managers reconstruct status after the delay has already cost time."],
    promise: "One controlled operating path from release intake to shipment.",
    proofTitle: "Built around real manufacturing work—not generic task management.",
    proofBody: "Ellwood Flow connects release intake, controlled documents, production dispatch, inventory, QC, palletization, shipping, reports, and audit history. Yorkstead Operations shows how the same thinking adapts across manufacturing and fabrication workflows.",
    images: ["public/media/ellwood/active-release.png", "public/media/ellwood/production.png", "public/media/ellwood/reports.png"],
    captions: ["Active release workspace", "Production dispatch", "Operational reporting"],
    opportunities: ["Release & document control", "Digital travelers & scanning", "Inventory & purchasing", "Quality & traceability", "Production dashboards"],
    first: "Start with one costly handoff: map it, measure it, and ship a focused working system.",
    close: "Your operation does not need more software.\nIt needs fewer broken handoffs.",
  },
  {
    file: "Yorkstead-Restaurant-Operations-Pitch.pptx", sector: "RESTAURANTS + POS", accent: C.orange,
    title: "One live table. Everyone sees what they need.",
    subtitle: "A restaurant operating system concept that connects guests, servers, kitchen stations, expo, managers, and service analytics.",
    pain: ["Servers carry requests, coursing, handoffs, and split checks in their heads.", "Guest, kitchen, and manager tools see fragments of the same meal.", "Operators learn why service slipped only after the shift."],
    promise: "A shared table session becomes the source of truth for the entire service.",
    proofTitle: "Designed around hospitality roles, not a single checkout screen.",
    proofBody: "SIC Pizza demonstrates phone-first floor management, guest QR participation, station-specific kitchen queues, handoffs, manager interventions, and service analytics. Payment and production integrations remain implementation work—not simulated success claims.",
    images: ["public/media/sic/floor.png", "public/media/sic/kitchen.png", "public/media/sic/analytics.png"],
    captions: ["Live dining room", "Multi-station KDS", "Service analytics"],
    opportunities: ["Mobile server workflow", "Guest QR ordering", "Kitchen display systems", "Shift handoffs", "Service metrics"],
    first: "Choose one service bottleneck—requests, kitchen flow, split checks, or handoff—and prove the workflow before replacing everything.",
    close: "Do not add another screen to the restaurant.\nConnect the service.",
  },
  {
    file: "Yorkstead-Retail-Ecommerce-Pitch.pptx", sector: "RETAIL + E-COMMERCE", accent: C.rose,
    title: "Make the product feel valuable before the customer touches it.",
    subtitle: "Distinctive storefronts, product storytelling, custom-order intake, and the operational pieces behind a confident purchase.",
    pain: ["Template storefronts flatten what makes the product worth buying.", "Custom requests arrive without the details needed to quote or fulfill them.", "Marketing, catalog, checkout, and fulfillment feel like separate businesses."],
    promise: "A storefront that sells the product—and hands clean work to the operator.",
    proofTitle: "JWLD turns a hand-finished product into a coherent buying experience.",
    proofBody: "The project combines art direction, a focused catalog, product detail, custom commission intake, cart behavior, and a premium visual system. The live storefront is evidence of the customer-facing experience; commercial outcomes are not yet quantified.",
    images: ["public/media/jwld/screenshots/home.png", "public/media/jwld/screenshots/catalog.png", "public/media/jwld/screenshots/custom-form.png"],
    captions: ["Brand-led storefront", "Focused catalog", "Custom commission intake"],
    opportunities: ["Storefront strategy", "Product & collection pages", "Custom order intake", "Checkout & fulfillment flow", "Launch measurement"],
    first: "Start with the buying path that matters most: discover, trust, choose, purchase—or request something custom.",
    close: "A beautiful store gets attention.\nA connected store gets the order right.",
  },
  {
    file: "Yorkstead-Business-Websites-Pitch.pptx", sector: "BUSINESS WEBSITES", accent: C.violet,
    title: "Your website should help a buyer decide—and help you act.",
    subtitle: "Clear positioning, credible proof, useful intake, and a direct path from interest to qualified work.",
    pain: ["Generic copy makes every business sound interchangeable.", "Project proof is buried or shown without the operational context buyers need.", "Contact forms collect messages—not enough information to take the next step."],
    promise: "A customer journey that explains the work, proves capability, and creates a useful handoff.",
    proofTitle: "Yorkstead.com is built as a working sales and operations surface.",
    proofBody: "The public site connects positioning, services, project evidence, workflow audits, consultation paths, and an owner Command Center. Its case studies use authentic system screens and explicit limitations instead of inflated results.",
    images: ["public/media/yorkstead-ops/pages/operations-1.png", "public/media/jwld/screenshots/home.png", "public/media/ellwood/active-release.png"],
    captions: ["Operational product story", "Distinctive customer experience", "Proof from the working system"],
    opportunities: ["Positioning & information design", "Conversion-focused build", "Case studies & proof", "Qualified intake", "Measurement & iteration"],
    first: "Pick one buyer and one decision. Build the shortest credible path from their problem to a qualified conversation.",
    close: "Do not launch another brochure.\nBuild the beginning of the sales process.",
  },
  {
    file: "Yorkstead-Workflow-Automation-Dashboards-Pitch.pptx", sector: "WORKFLOW + DATA", accent: C.green,
    title: "Turn scattered activity into visible, actionable work.",
    subtitle: "Workflow automation, operational dashboards, and focused internal tools for owner-led teams.",
    pain: ["People re-enter the same information across forms, spreadsheets, inboxes, and systems.", "Dashboards report history but do not show the next action or owner.", "Automation fails when it ignores exceptions, approvals, and human judgment."],
    promise: "Connect the handoff, preserve the decision, and surface what needs attention now.",
    proofTitle: "The work spans intake, execution, exceptions, and measurement.",
    proofBody: "Yorkstead systems combine structured intake, shared records, explicit workflow state, dashboards, audit trails, and operational reporting. The implementation can sit beside existing tools or become a focused system where spreadsheets have reached their limit.",
    images: ["public/media/yorkstead-ops/pages/operations-7.png", "public/media/ellwood/reports.png", "public/media/sic/analytics.png"],
    captions: ["Connected records and handoffs", "Manufacturing metrics", "Service telemetry"],
    opportunities: ["Workflow audit", "Forms & intake automation", "Operations dashboards", "Approvals & exception handling", "System integration"],
    first: "Begin with the repeated handoff that consumes attention every week. Make it visible, measurable, and easier to complete.",
    close: "The goal is not more automation.\nThe goal is less operational drag.",
  },
];

async function blobFor(rel) { const b = await fs.readFile(path.join(ROOT, rel)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); }
function box(slide, name, x, y, w, h, fill = "none", line = "none") { return slide.shapes.add({ geometry: "rect", name, position: { left:x, top:y, width:w, height:h }, fill, line: { style:"solid", fill:line, width: line === "none" ? 0 : 1 } }); }
function text(slide, name, value, x, y, w, h, size, color=C.ink, bold=false, align="left") { const s=box(slide,name,x,y,w,h,"none","none"); s.text=value; s.text.style={fontSize:size,typeface:"Arial",color,bold,alignment:align,verticalAlignment:"middle",autoFit:"shrinkText",insets:{top:0,right:0,bottom:0,left:0}}; return s; }
function footer(slide, n, accent) { box(slide,"footer-rule",42,676,1196,2,accent,"none"); text(slide,"footer-brand","YORKSTEAD SYSTEMS",42,684,240,18,12,C.muted,true); text(slide,"footer-page",String(n).padStart(2,"0"),1185,684,53,18,12,C.muted,true,"right"); }
function titleLine(slide, eyebrow, titleValue, n, accent) { text(slide,"eyebrow",eyebrow,42,34,500,24,15,accent,true); text(slide,"slide-title",titleValue,42,68,1160,76,38,C.ink,true); footer(slide,n,accent); }
async function addImg(slide, rel, x,y,w,h, alt) { slide.images.add({ blob:await blobFor(rel), contentType:"image/png", alt, fit:"cover", position:{left:x,top:y,width:w,height:h}, geometry:"rect" }); }
function notes(slide, sources) { slide.speakerNotes.textFrame.setText(`[Sources]\n${sources.map(s=>`- ${s}`).join("\n")}\n[/Sources]`); }

async function build(cfg) {
  const p=Presentation.create({slideSize:{width:W,height:H}});
  let s=p.slides.add(); s.background.fill=C.white; box(s,"accent-field",802,0,478,H,cfg.accent,"none"); text(s,"brand","YORKSTEAD SYSTEMS",42,38,400,26,15,C.ink,true); text(s,"sector",cfg.sector,42,126,480,32,18,cfg.accent,true); text(s,"deck-title",cfg.title,42,174,700,240,58,C.ink,true); text(s,"deck-subtitle",cfg.subtitle,42,446,690,108,22,C.muted,false); text(s,"contact","Brandon York  •  hello@yorkstead.com  •  yorkstead.com",42,642,700,24,14,C.muted,true); text(s,"accent-copy","SOFTWARE THAT\nKEEPS REAL-WORLD\nWORK MOVING.",842,410,360,180,34,C.white,true); notes(s,["Yorkstead Systems brand positioning: repository lib/brand.ts"]);

  s=p.slides.add(); s.background.fill=C.white; titleLine(s,cfg.sector,"The expensive part is the handoff nobody owns.",2,cfg.accent); cfg.pain.forEach((v,i)=>{ text(s,`pain-num-${i}`,`0${i+1}`,42,184+i*136,70,60,27,cfg.accent,true); text(s,`pain-${i}`,v,135,174+i*136,1010,82,25,C.ink,true); box(s,`pain-rule-${i}`,135,264+i*136,1010,1,C.rule,"none");}); notes(s,["Buyer problems synthesized from Yorkstead project workflows; no external quantitative claim."]);

  s=p.slides.add(); s.background.fill=C.navy; text(s,"eyebrow",cfg.sector,42,34,500,24,15,cfg.accent,true); text(s,"promise",cfg.promise,42,110,760,170,48,C.white,true); text(s,"body","The useful system is not the one with the most features. It is the one that keeps context attached as work moves between people, decisions, and tools.",42,334,690,130,25,"#D7E0E7",false); box(s,"signal",850,122,330,330,cfg.accent,"none"); text(s,"signal-copy","SHARED\nCONTEXT\n→\nCLEAR\nNEXT STEP",890,154,250,270,30,C.white,true,"center"); footer(s,3,cfg.accent); notes(s,["Yorkstead Systems positioning and repository case-study narratives."]);

  s=p.slides.add(); s.background.fill=C.white; titleLine(s,cfg.sector,cfg.proofTitle,4,cfg.accent); text(s,"proof-body",cfg.proofBody,42,168,410,330,23,C.muted,false); await addImg(s,cfg.images[0],506,168,690,388,cfg.captions[0]); box(s,"image-caption-bg",506,530,690,46,C.ink,"none"); text(s,"image-caption",cfg.captions[0],526,538,650,28,15,C.white,true); notes(s,[path.join(ROOT,cfg.images[0]),"Repository project documentation and case-study limitations."]);

  s=p.slides.add(); s.background.fill=C.white; titleLine(s,cfg.sector,"Proof you can point to—not promises you have to explain.",5,cfg.accent); const iw=354; for(let i=0;i<3;i++){ await addImg(s,cfg.images[i],42+i*398,170,iw,250,cfg.captions[i]); text(s,`cap-${i}`,cfg.captions[i],42+i*398,436,iw,35,18,C.ink,true); } text(s,"proof-note","These are working interfaces and documented prototypes. Where outcomes have not been measured, the deck says so.",42,530,1100,62,24,C.muted,true); notes(s,cfg.images.map(v=>path.join(ROOT,v)));

  s=p.slides.add(); s.background.fill=C.white; titleLine(s,cfg.sector,"A focused first engagement creates momentum without a blank check.",6,cfg.accent); text(s,"first",cfg.first,42,168,760,108,29,C.ink,true); cfg.opportunities.forEach((v,i)=>{ box(s,`opp-rule-${i}`,42,322+i*54,850,1,i===0?cfg.accent:C.rule,"none"); text(s,`opp-${i}`,v,42,332+i*54,780,38,21,i===0?cfg.accent:C.ink,i===0); text(s,`opp-num-${i}`,String(i+1).padStart(2,"0"),930,332+i*54,80,38,17,C.muted,true,"right"); }); box(s,"engagement",1040,168,158,388,C.pale,"none"); text(s,"engagement-copy","AUDIT\n\nPRIORITIZE\n\nBUILD\n\nVERIFY\n\nHAND OFF",1062,188,114,350,20,C.ink,true,"center"); notes(s,["Engagement framing from yorkstead.com services, packages, and workflow-audit content."]);

  s=p.slides.add(); s.background.fill=C.ink; text(s,"brand","YORKSTEAD SYSTEMS",42,38,400,26,15,cfg.accent,true); text(s,"close",cfg.close,42,158,1050,230,54,C.white,true); text(s,"ask","Bring one broken workflow. We’ll identify the first useful system and the shortest path to shipping it.",42,458,820,90,25,"#D7E0E7",false); text(s,"contact","hello@yorkstead.com  •  yorkstead.com",42,620,650,30,18,C.white,true); box(s,"accent-block",1040,0,240,H,cfg.accent,"none"); notes(s,["Yorkstead Systems contact and engagement positioning."]);

  await fs.mkdir(OUT,{recursive:true}); const file=path.join(OUT,cfg.file); const pptx=await PresentationFile.exportPptx(p); await pptx.save(file);
  const renderDir=path.join(OUT,"renders",path.basename(cfg.file,".pptx")); await fs.mkdir(renderDir,{recursive:true});
  for(let i=0;i<p.slides.items.length;i++){ const b=await p.export({slide:p.slides.items[i],format:"png",scale:1}); await fs.writeFile(path.join(renderDir,`slide-${i+1}.png`),new Uint8Array(await b.arrayBuffer())); }
  return file;
}

await fs.mkdir(OUT,{recursive:true});
const files=[]; for(const cfg of configs) files.push(await build(cfg));
await fs.writeFile(path.join(OUT,"README.txt"),`Yorkstead Systems pitch-deck suite\n\n${files.map(f=>path.basename(f)).join("\n")}\n\nAll decks use repository-backed screenshots and avoid unverified ROI claims.\n`);
console.log(files.join("\n"));
