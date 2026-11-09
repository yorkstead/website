#!/usr/bin/env python3
"""Fail-closed cleanup for one labeled private recovery rehearsal target."""

import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import stat
import subprocess
import sys

LABEL = "ys-sys-001.target"
ACTIVE_CONTEXT: str | None = None
RESOURCE_TYPES = {
    "container": ("ps", "-aq"),
    "network": ("network", "ls", "-q"),
    "volume": ("volume", "ls", "-q"),
    "image": ("image", "ls", "-q"),
}


class CleanupError(RuntimeError):
    pass


def docker(args: list[str], *, check: bool = True) -> str:
    context_args = ["--context", ACTIVE_CONTEXT] if ACTIVE_CONTEXT else []
    result = subprocess.run(["docker", *context_args, *args], text=True, capture_output=True, check=False)
    if check and result.returncode:
        raise CleanupError("Docker operation failed; target retained for owner review")
    return result.stdout.strip()


def artifact_identity(path: pathlib.Path) -> dict[str, int | str]:
    if path.is_symlink() or not path.is_file():
        raise CleanupError("approved encrypted artifact is not a regular file")
    info = path.stat()
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return {"device": info.st_dev, "inode": info.st_ino, "size": info.st_size,
            "mtimeNs": info.st_mtime_ns, "sha256": digest.hexdigest()}


def resource_ids(kind: str, target_id: str) -> list[str]:
    listing = RESOURCE_TYPES[kind]
    args = [*listing, "--filter", f"label={LABEL}={target_id}"]
    output = docker(args)
    return [item for item in output.splitlines() if item]


def inspect_label(kind: str, resource_id: str, target_id: str) -> None:
    expected_name = f"ys-sys-001-{target_id}-"
    if kind == "container":
        raw = docker(["inspect", resource_id])
        obj = json.loads(raw)[0]
        labels = obj.get("Config", {}).get("Labels") or {}
        name = (obj.get("Name") or "").lstrip("/")
    elif kind == "image":
        raw = docker(["image", "inspect", resource_id])
        obj = json.loads(raw)[0]
        labels = obj.get("Config", {}).get("Labels") or {}
        tags = obj.get("RepoTags") or []
        name_ok = any(tag in tags for tag in (
            f"ys-sys-001-rehearsal-app:{target_id}",
            f"ys-sys-001-rehearsal-runner:{target_id}",
        ))
    else:
        raw = docker([kind, "inspect", resource_id])
        obj = json.loads(raw)[0]
        labels = obj.get("Labels") or {}
        name = obj.get("Name") or ""
    if labels.get(LABEL) != target_id or (kind == "image" and not name_ok) or (kind != "image" and not name.startswith(expected_name)):
        raise CleanupError("resource identity could not be proven; no resources removed")


def remove_resources(target_id: str, expected_context: str) -> None:
    global ACTIVE_CONTEXT
    if not expected_context:
        raise CleanupError("Docker context was not explicitly approved; no resources removed")
    ACTIVE_CONTEXT = expected_context
    if docker(["context", "show"]) != expected_context:
        raise CleanupError("Docker context differs from the explicitly approved context; no resources removed")
    remove_args = {
        "container": lambda rid: ["rm", "--force", rid],
        "network": lambda rid: ["network", "rm", rid],
        "volume": lambda rid: ["volume", "rm", rid],
        "image": lambda rid: ["image", "rm", rid],
    }
    # Validate every candidate before changing any resource.
    resources = {kind: resource_ids(kind, target_id) for kind in RESOURCE_TYPES}
    for kind, ids in resources.items():
        for rid in ids:
            inspect_label(kind, rid, target_id)
    # Containers first, then networks and volumes, then the uniquely labeled image.
    for kind in ("container", "network", "volume", "image"):
        for rid in resources[kind]:
            docker(remove_args[kind](rid))
    remaining = {kind: resource_ids(kind, target_id) for kind in RESOURCE_TYPES}
    if any(remaining.values()):
        raise CleanupError("labeled rehearsal resources remain after cleanup")


def validate_workspace(path: pathlib.Path, target_id: str) -> None:
    if path.is_symlink() or not path.is_dir() or stat.S_IMODE(path.stat().st_mode) != 0o700:
        raise CleanupError("private rehearsal workspace is missing or has unsafe permissions")
    marker = path / ".ys-sys-001-target-id"
    if marker.is_symlink() or marker.read_text(encoding="ascii").strip() != target_id:
        raise CleanupError("workspace target marker does not match")


def record_artifact(workspace: pathlib.Path, target_id: str, artifact: pathlib.Path) -> None:
    if workspace.is_symlink():
        raise CleanupError("private rehearsal workspace may not be a symlink")
    workspace = workspace.resolve(strict=True)
    if not workspace.is_dir() or stat.S_IMODE(workspace.stat().st_mode) != 0o700:
        raise CleanupError("private rehearsal workspace must already exist with mode 0700")
    marker = workspace / ".ys-sys-001-target-id"
    identity = workspace / ".artifact-identity.json"
    if marker.exists() or identity.exists():
        raise CleanupError("target metadata already exists; refusing to replace it")
    for path, content in ((marker, target_id + "\n"),
                          (identity, json.dumps(artifact_identity(artifact), separators=(",", ":")))):
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())


def cleanup_workspace(workspace: pathlib.Path, artifact: pathlib.Path) -> None:
    expected_path = workspace / ".artifact-identity.json"
    if expected_path.is_symlink() or not expected_path.is_file():
        raise CleanupError("private artifact identity record is missing")
    expected = json.loads(expected_path.read_text(encoding="utf-8"))
    if artifact_identity(artifact) != expected:
        raise CleanupError("approved encrypted artifact changed; private workspace retained")
    # Preserve sanitized and private diagnostic evidence. Only ephemeral plaintext,
    # generated credentials, and TLS key material may be removed here.
    for name in ("plaintext", "secrets", "tls", "app-source"):
        candidate = workspace / name
        if candidate.exists():
            if candidate.is_symlink() or candidate.resolve().parent != workspace:
                raise CleanupError("temporary path escaped the private workspace")
            if candidate.is_dir():
                shutil.rmtree(candidate)
            else:
                candidate.unlink()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("record-artifact", "cleanup"))
    parser.add_argument("--target-id", required=True)
    parser.add_argument("--workspace", required=True, type=pathlib.Path)
    parser.add_argument("--artifact", required=True, type=pathlib.Path)
    parser.add_argument("--docker-context")
    args = parser.parse_args()
    target_id = args.target_id
    if not re.fullmatch(r"[a-f0-9]{24}", target_id):
        raise CleanupError("generated target identifier is invalid")
    if args.workspace.is_symlink() or args.artifact.is_symlink():
        raise CleanupError("workspace and artifact paths may not be symlinks")
    workspace = args.workspace.resolve(strict=True)
    artifact = args.artifact.resolve(strict=True)
    if args.action == "record-artifact":
        record_artifact(workspace, target_id, artifact)
        print(json.dumps({"target": "recorded", "artifact": "identity stored privately"}, separators=(",", ":")))
        return 0
    validate_workspace(workspace, target_id)
    if not args.docker_context:
        raise CleanupError("explicit Docker context is required for destructive cleanup")
    remove_resources(target_id, args.docker_context)
    cleanup_workspace(workspace, artifact)
    print(json.dumps({"target": "synthetic-or-private-disposable", "resources": "removed",
                      "artifact": "unchanged", "temporarySecretsAndPlaintext": "removed",
                      "diagnostics": "retained"}, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (CleanupError, OSError, ValueError, IndexError, json.JSONDecodeError):
        print("Private recovery cleanup failed closed; inspect the private workspace and Docker labels locally.", file=sys.stderr)
        raise SystemExit(1)
