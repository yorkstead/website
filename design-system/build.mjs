// Rebuilds the Yorkstead design system files from this repository.
//   bun run design-system
// Output: design-system/dist/project/ — the design system's files, ready to publish.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SHIMS = join(HERE, "shims");
const OUT = join(HERE, "dist", "project");
const Bun = globalThis.Bun;
if (!Bun) throw new Error("Run this with Bun: bun run design-system");

// Order of the component catalogue; each needs source/components/<Name>/.
const COMPONENTS = [
  "Button", "Badge", "Card", "Input", "Textarea", "Label", "BrandMark", "ProjectStatusBadge", "ThemeToggle", "PrintButton",
  "SiteHeader", "SiteFooter", "ContactForm", "WorkflowLeadForm", "CaseStudyCard", "SolutionCard", "DemoCard",
  "LabExperimentCard", "EngagementPricing", "ProjectStatusLegend", "FounderIntroduction", "PaginationControls",
];

// Next.js and server-only modules → preview stand-ins (see shims/).
const STAND_INS = {
  "next/link": "next-link.js",
  "next/image": "next-image.js",
  "next/navigation": "next-navigation.js",
  "next-themes": "next-themes.js",
  "node:crypto": "node-builtins.js",
  "node:fs": "node-builtins.js",
  "node:path": "node-builtins.js",
  "@/app/actions/contact": "actions.js",
  "@/app/actions/workflow": "actions.js",
  "@/components/conversion-tracker": "conversion-tracker.js",
};

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
const warnings = [];

function resolveAlias(path) {
  for (const ext of [".tsx", ".ts", ".js"]) {
    const file = join(ROOT, path.slice(2) + ext);
    if (existsSync(file)) return file;
  }
  return undefined;
}

// lucide's barrel file defeats Bun's tree-shaking (the whole icon set lands in the bundle), and its
// CommonJS build loses icons referenced at module scope. So point "lucide-react" at a generated module
// that re-exports, from lucide's ESM build, only the icons the bundled code imports.
function slimLucide() {
  const esm = join(ROOT, "node_modules/lucide-react/dist/esm");
  const exportsByName = new Map();
  for (const match of readFileSync(join(esm, "lucide-react.js"), "utf8").matchAll(/export \{ ([^}]+) \} from '(\.\/[^']+)';/g)) {
    for (const part of match[1].split(",")) {
      const alias = /default as (\w+)/.exec(part.trim());
      if (alias) exportsByName.set(alias[1], join(esm, match[2]));
    }
  }
  const used = new Set();
  const sources = [join(HERE, "entry.js"), ...listFiles(join(ROOT, "components")).filter((file) => /\.tsx?$/.test(file))];
  for (const file of sources) {
    for (const match of readFileSync(file, "utf8").matchAll(/import \{([^}]+)\} from "lucide-react"/g)) {
      for (const name of match[1].split(",").map((part) => part.trim().split(/\s+as\s+/)[0]).filter(Boolean)) used.add(name);
    }
  }
  const lines = [...used].sort().map((name) => {
    if (!exportsByName.has(name)) throw new Error(`lucide-react has no icon named ${name}`);
    return `export { default as ${name} } from ${JSON.stringify(exportsByName.get(name))};`;
  });
  const file = join(HERE, "dist", "lucide-react.js");
  writeFileSync(file, lines.join("\n") + "\n");
  return file;
}

function standInPlugin({ reactFromGlobals }) {
  const lucide = slimLucide();
  return {
    name: "yorkstead-stand-ins",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (reactFromGlobals) {
          if (args.path === "react/jsx-runtime" || args.path === "react/jsx-dev-runtime") return { path: join(SHIMS, "jsx-runtime.cjs") };
          if (args.path === "react") return { path: join(SHIMS, "react-global.cjs") };
          if (args.path === "react-dom" || args.path === "react-dom/client") return { path: join(SHIMS, "react-dom-global.cjs") };
        }
        if (args.path === "lucide-react") return { path: lucide };
        if (STAND_INS[args.path]) return { path: join(SHIMS, STAND_INS[args.path]) };
        if (args.path.startsWith("@/")) return resolveAlias(args.path) ? { path: resolveAlias(args.path) } : undefined;
        return undefined;
      });
    },
  };
}

// Inline <script> safety: the design system inlines these files into preview frames.
const inlineSafe = (code) => code.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");

async function bundle(entry, plugins) {
  const result = await Bun.build({
    entrypoints: [entry],
    format: "iife",
    minify: true,
    target: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
    // Components read process.env / process.cwd(); in a browser both are empty.
    banner: 'var process={env:{NODE_ENV:"production"},cwd:function(){return ""}};',
    plugins,
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(`Bundling ${relative(ROOT, entry)} failed`);
  }
  return inlineSafe(await result.outputs[0].text());
}

function reactVersion() {
  return JSON.parse(readFileSync(join(ROOT, "node_modules/react/package.json"), "utf8")).version;
}

// app/globals.css → tokens.json: colour values per theme and the radius scale. Usage notes are kept.
function readThemeBlock(css, selector) {
  const match = new RegExp(`\\n${selector.replace(".", "\\.")} \\{([\\s\\S]*?)\\n\\}`).exec(css);
  if (!match) throw new Error(`app/globals.css has no ${selector} block`);
  return Object.fromEntries([...match[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function syncTokens(tokens) {
  const css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
  const light = readThemeBlock(css, ":root");
  const dark = readThemeBlock(css, ".dark");
  const radius = light.radius;
  delete light.radius;
  delete light["color-scheme"];
  delete dark["color-scheme"];

  const byName = new Map(tokens.color.tokens.map((token) => [token.name, token]));
  const changed = [];
  for (const [name, value] of Object.entries(light)) {
    const next = { light: value, dark: dark[name] ?? value };
    const token = byName.get(name);
    if (!token) {
      tokens.color.tokens.push({ name, value: next, usage: "New in app/globals.css — describe where it is used." });
      warnings.push(`New colour variable --${name}: added to tokens.json; write its usage note in design-system/source/tokens.json.`);
      continue;
    }
    if (JSON.stringify(token.value) !== JSON.stringify(next)) changed.push(name);
    token.value = next;
  }
  const siteNames = new Set(Object.keys(light));
  for (const token of tokens.color.tokens) {
    const fromSite = !/^(status|mark|collateral)-/.test(token.name);
    if (fromSite && !siteNames.has(token.name)) warnings.push(`--${token.name} is no longer in app/globals.css; remove it from design-system/source/tokens.json if it is gone for good.`);
  }

  const base = Number.parseFloat(radius);
  const scale = { radius: 1, "radius-sm": 0.75, "radius-md": 0.875, "radius-lg": 1, "radius-xl": 1.5 };
  for (const token of tokens.radius.tokens) {
    if (scale[token.name]) token.value = `${+(base * scale[token.name]).toFixed(4)}rem`;
  }
  const glow = tokens.shadow.tokens.find((token) => token.name === "shadow-glow");
  if (glow) glow.value = { light: `0 0 24px -8px ${light.primary}`, dark: `0 0 24px -8px ${dark.primary}` };

  tokens.meta = { ...tokens.meta, ref: `${git("rev-parse", "--abbrev-ref", "HEAD")}@${git("rev-parse", "--short", "HEAD")}`, synced: new Date().toISOString().slice(0, 10) };
  return changed;
}

// app/globals.css → bundle.css: the site's Tailwind build of components/ and lib/.
// Colour variables are left out (tokens.css supplies them per theme) and dark: follows data-theme.
async function buildStylesheet() {
  let css = readFileSync(join(ROOT, "app/globals.css"), "utf8");
  css = css.replace(/\n:root \{[\s\S]*?\n\}\n/, "\n").replace(/\n\.dark \{[\s\S]*?\n\}\n/, "\n");
  css = css.replace('@import "tailwindcss";', `@import "tailwindcss" source(none);\n@source "${join(ROOT, "components")}";\n@source "${join(ROOT, "lib")}";`);
  css = css.replace("@custom-variant dark (&:is(.dark *));", '@custom-variant dark (&:is([data-theme="dark"] *, .dark *));');
  const from = join(HERE, "dist", "input.css");
  const result = await postcss([tailwind({ base: ROOT, optimize: { minify: true } })]).process(css, { from });
  return "/* Yorkstead Systems: Tailwind build of components/ and lib/ against app/globals.css. */\n" + result.css.replace(/<\/style/gi, "<\\/style");
}

function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}

rmSync(join(HERE, "dist"), { recursive: true, force: true });
mkdirSync(join(OUT, "components/lib"), { recursive: true });
cpSync(join(HERE, "source"), OUT, { recursive: true });

for (const name of COMPONENTS) {
  if (!existsSync(join(OUT, "components", name, "preview.html"))) warnings.push(`${name} has no source/components/${name}/preview.html.`);
}

const tokens = JSON.parse(readFileSync(join(OUT, "tokens.json"), "utf8"));
const changed = syncTokens(tokens);
writeFileSync(join(OUT, "tokens.json"), JSON.stringify(tokens, null, 1) + "\n");

writeFileSync(join(OUT, "components/lib/react.production.min.js"), await bundle(join(SHIMS, "react-lib.js"), []));
const reactFromWindow = { name: "react-from-window", setup(build) { build.onResolve({ filter: /^react$/ }, () => ({ path: join(SHIMS, "react-global.cjs") })); } };
writeFileSync(join(OUT, "components/lib/react-dom.production.min.js"), await bundle(join(SHIMS, "react-dom-lib.js"), [reactFromWindow]));

const header = `/* @ds-bundle: ${JSON.stringify({ format: 4, namespace: "Yorkstead", components: COMPONENTS.map((name) => ({ name })) })} */\n`;
writeFileSync(join(OUT, "components/bundle.js"), header + await bundle(join(HERE, "entry.js"), [standInPlugin({ reactFromGlobals: true })]));
writeFileSync(join(OUT, "components/bundle.css"), await buildStylesheet());

// The index names React by version; keep it in step with the installed one.
const index = JSON.parse(readFileSync(join(OUT, "design-system.json"), "utf8"));
index.libraries = [
  { name: "react", version: reactVersion(), global: "React", file: "components/lib/react.production.min.js" },
  { name: "react-dom", version: reactVersion(), global: "ReactDOM", file: "components/lib/react-dom.production.min.js" },
];
index.lastChange = { by: git("config", "user.name") || "Yorkstead", at: new Date().toISOString(), via: `GitHub · yorkstead/website@${git("rev-parse", "--short", "HEAD")}`, note: changed.length ? `Re-synced: ${changed.join(", ")} changed` : "Re-synced from the repository" };
writeFileSync(join(OUT, "design-system.json"), JSON.stringify(index, null, 1) + "\n");

const files = listFiles(OUT);
for (const file of files) {
  const size = statSync(file).size;
  if (size > 6 * 1024 * 1024) warnings.push(`${relative(OUT, file)} is ${size} bytes, over the 6 MB bundle cap.`);
}
console.log(`Built ${files.length} files in ${relative(ROOT, OUT)}/`);
console.log(changed.length ? `Colour tokens changed since the last sync: ${changed.join(", ")}` : "Colour tokens match app/globals.css.");
for (const warning of warnings) console.warn(`warning: ${warning}`);
