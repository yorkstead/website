import * as React from "react";
import { omit } from "./omit.js";

// Preview stand-in for next/link: a plain anchor that stays inside the preview frame.
const Link = React.forwardRef(function Link({ href, onClick, ...rest }, ref) {
  const props = omit(rest, ["prefetch", "replace", "scroll", "shallow"]);
  const url = typeof href === "string" ? href : href?.pathname ?? "#";
  const handleClick = (event) => {
    onClick?.(event);
    if (url.startsWith("/")) event.preventDefault();
  };
  return React.createElement("a", { ref, href: url, onClick: handleClick, ...props });
});

export default Link;
