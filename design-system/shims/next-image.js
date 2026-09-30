import * as React from "react";
import { assetURL } from "./public-assets.js";
import { omit } from "./omit.js";

// Preview stand-in for next/image: an <img> pointing at the uploaded asset.
export default function Image({ src, fill, priority, style, ...rest }) {
  const props = omit(rest, ["quality", "sizes", "loader", "placeholder", "blurDataURL", "unoptimized"]);
  const url = assetURL(typeof src === "string" ? src : src?.src);
  const fillStyle = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : {};
  return React.createElement("img", { src: url, loading: priority ? "eager" : props.loading, style: { ...fillStyle, ...style }, ...props });
}

export function getImageProps({ src, alt, width, height }) {
  const url = assetURL(src);
  return { props: { src: url, srcSet: url, alt, width, height } };
}
