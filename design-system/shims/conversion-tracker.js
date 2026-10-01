import * as React from "react";
import Link from "./next-link.js";
import { omit } from "./omit.js";

// Preview stand-in: the real tracker posts analytics beacons; previews record nothing.
export function trackConversionEvent() {}

export function WorkflowAuditViewTracker() {
  return null;
}

export function ConversionViewTracker() {
  return null;
}

export function TrackedLink({ href, children, ...rest }) {
  return React.createElement(Link, { href, ...omit(rest, ["event", "metadata"]) }, children);
}
