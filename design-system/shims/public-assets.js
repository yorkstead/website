// Site public paths → the design system's uploaded copies (asset ids in source/design-system.json).
// Add a line here when a bundled component starts showing another file from public/.
export const publicAssets = {
  "/brand/logo/1x/logo-light.png": "/_blob/85ecb3e41e3145f615f01c250ba5b6d2",
  "/brand/logo/1x/logo-dark.png": "/_blob/c24ad4c32152d1f354dc1ad01f3b95b4",
  "/media/founder/brandon-york.jpg": "/_blob/b5ce0180cc873f1010f06b1323bba9ba",
  "/media/rework-flow/dispatch-board.png": "/_blob/803113c98ea80ae51ca2f460880d860d",
  "/media/table-os/floor-operations.png": "/_blob/e3c5651d93cf692c5f2929bcce81c971",
  "/media/ellwood/active-release.png": "/_blob/61fa4dd681c94806605af58af4afe646",
  "/media/yorkstead-ops/screenshots/003-projects-command-center.png": "/_blob/392c71424ba27dcfecd1ebfa8a25ff43",
  "/media/jwld/screenshots/home.png": "/_blob/4966ce66918f99f3191cb7eb74e52eb9",
  "/media/projects/sic-pizza/floor.png": "/_blob/7ae9e64cc2fca40ee4a314d6d8660b2a",
};

export function assetURL(src) {
  return publicAssets[src] ?? src;
}
