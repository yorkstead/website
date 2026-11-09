#!/usr/bin/env python3
"""Private monotonic incident-to-ready clock; stores only sanitized timestamps."""

import argparse
import json
import os
import pathlib
import stat
import sys
import time


def fail(message: str) -> None:
    print(f"Private recovery clock failed: {message}", file=sys.stderr)
    raise SystemExit(1)


def utc_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def boot_id() -> str:
    try:
        return pathlib.Path("/proc/sys/kernel/random/boot_id").read_text(encoding="ascii").strip()
    except OSError:
        fail("same-boot monotonic clock identity unavailable")
        raise AssertionError


def load_state(path: pathlib.Path) -> dict:
    try:
        metadata = path.stat()
        if stat.S_IMODE(metadata.st_mode) != 0o600:
            fail("clock state must have mode 0600")
        value = json.loads(path.read_text(encoding="utf-8"))
        if value.get("bootId") != boot_id():
            fail("system reboot detected; continuous RTO evidence is invalid")
        return value
    except (OSError, ValueError, AttributeError):
        fail("clock state is missing or invalid")
        raise AssertionError


def save_state(path: pathlib.Path, state: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        json.dump(state, stream, separators=(",", ":"))
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temporary, path)
    os.chmod(path, 0o600)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("start", "ready", "cleanup-verified", "cleanup-after-reboot"))
    parser.add_argument("--state", required=True, type=pathlib.Path)
    args = parser.parse_args()
    path = args.state.resolve()
    parent_mode = stat.S_IMODE(path.parent.stat().st_mode)
    if parent_mode & 0o077:
        fail("clock state directory must be private (mode 0700)")

    if args.action == "start":
        if path.exists():
            fail("clock already exists; do not restart or pause the RTO")
        state = {"bootId": boot_id(), "t0Utc": utc_now(), "t0MonotonicNs": time.monotonic_ns()}
        save_state(path, state)
        print(json.dumps({"T0": state["t0Utc"], "status": "RUNNING"}, separators=(",", ":")))
        return

    if args.action == "cleanup-after-reboot":
        try:
            metadata = path.stat()
            if stat.S_IMODE(metadata.st_mode) != 0o600:
                fail("clock state must have mode 0600")
            state = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            fail("clock state is missing or invalid")
        if state.get("bootId") == boot_id() or "tCleanupVerifiedUtc" in state:
            fail("reboot cleanup recording requires a prior boot and no existing cleanup timestamp")
        now = time.monotonic_ns()
        state.update({
            "tCleanupVerifiedUtc": utc_now(),
            "tCleanupVerifiedMonotonicNs": now,
            "cleanupAfterReboot": True,
            "continuousRtoValid": False,
        })
        save_state(path, state)
        print(json.dumps({"T0": state["t0Utc"], "TCleanupVerified": state["tCleanupVerifiedUtc"],
                          "cleanup": "VERIFIED", "continuousRto": "INVALID_AFTER_REBOOT"}, separators=(",", ":")))
        return

    state = load_state(path)
    if args.action == "ready":
        if "tReadyUtc" in state:
            fail("T-ready is already recorded")
        now = time.monotonic_ns()
        elapsed = (now - int(state["t0MonotonicNs"])) / 1_000_000_000
        state.update({"tReadyUtc": utc_now(), "tReadyMonotonicNs": now})
        save_state(path, state)
        print(json.dumps({"T0": state["t0Utc"], "TReady": state["tReadyUtc"], "elapsedSeconds": round(elapsed, 3), "rtoPass": elapsed <= 3600}, separators=(",", ":")))
        if elapsed > 3600:
            raise SystemExit(1)
        return

    if "tCleanupVerifiedUtc" in state:
        fail("record cleanup only once")
    now = time.monotonic_ns()
    state.update({"tCleanupVerifiedUtc": utc_now(), "tCleanupVerifiedMonotonicNs": now})
    save_state(path, state)
    if "tReadyMonotonicNs" in state:
        result = {"T0": state["t0Utc"], "TReady": state["tReadyUtc"],
                  "TCleanupVerified": state["tCleanupVerifiedUtc"], "cleanup": "VERIFIED",
                  "rtoSeconds": round((int(state["tReadyMonotonicNs"]) - int(state["t0MonotonicNs"])) / 1_000_000_000, 3)}
    else:
        result = {"T0": state["t0Utc"], "TCleanupVerified": state["tCleanupVerifiedUtc"],
                  "cleanup": "VERIFIED", "readiness": "NOT_REACHED", "rtoPass": False,
                  "elapsedToCleanupSeconds": round((now - int(state["t0MonotonicNs"])) / 1_000_000_000, 3)}
    print(json.dumps(result, separators=(",", ":")))


if __name__ == "__main__":
    main()
