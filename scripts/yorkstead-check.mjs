import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "AGENTS.md",
  ".specify/memory/constitution.md",
  ".specify/templates/spec-template.md",
  ".specify/templates/plan-template.md",
  ".specify/templates/tasks-template.md",
  ".agents/skills/code-change-verification/SKILL.md",
  "docs/project-profile.md",
  "docs/verification.md",
  "docs/handoffs/CURRENT.md",
  "docs/release-checklist.md",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length > 0) {
  console.error("Yorkstead scaffold is incomplete. Missing:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const requiredScripts = ["yorkstead:check"];
const missingScripts = requiredScripts.filter((script) => !packageJson.scripts?.[script]);
if (missingScripts.length > 0) {
  console.error(`Missing package scripts: ${missingScripts.join(", ")}`);
  process.exit(1);
}
const expectedScripts = ["lint", "typecheck", "test", "build"];
const missingExpectedScripts = expectedScripts.filter((script) => !packageJson.scripts?.[script]);
if (missingExpectedScripts.length > 0) {
  console.warn(`Project-specific verification scripts still need to be configured: ${missingExpectedScripts.join(", ")}`);
}

const activeSpecs = fs.existsSync(path.join(root, "specs"))
  ? fs.readdirSync(path.join(root, "specs"), { withFileTypes: true }).filter((entry) => entry.isDirectory())
  : [];
if (activeSpecs.length === 0) {
  if (fs.existsSync(path.join(root, "specs", "README.md"))) {
    console.warn("No active feature spec exists yet; create the first directory under specs/.");
  } else {
    console.error("No active spec directory exists under specs/.");
    process.exit(1);
  }
}

const trackedText = ["AGENTS.md", "docs/project-profile.md", "docs/verification.md"]
  .map((file) => fs.readFileSync(path.join(root, file), "utf8").toLowerCase());
if (trackedText.some((content) => content.includes("-----begin private key-----"))) {
  console.error("Possible private key material found in scaffold guidance.");
  process.exit(1);
}

console.log(`PASS: Yorkstead scaffold, ${activeSpecs.length} active spec director${activeSpecs.length === 1 ? "y" : "ies"}, and required scripts are present.`);
