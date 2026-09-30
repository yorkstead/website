import { publicAssets } from "./public-assets.js";

// Server-only built-ins the bundled components import.
// FounderPortrait checks the public folder: in previews a path "exists" when it was uploaded.
export function existsSync(path) {
  return Object.keys(publicAssets).some((key) => path.endsWith(key));
}

export function join(...parts) {
  return parts.join("/").replace(/\/+/g, "/");
}

export function createHash() {
  throw new Error("createHash is server-only");
}
