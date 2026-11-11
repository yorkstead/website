import importlib.util
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch


MODULE_PATH = pathlib.Path(__file__).with_name("private-rehearsal-cleanup.py")
SPEC = importlib.util.spec_from_file_location("private_rehearsal_cleanup", MODULE_PATH)
cleanup = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(cleanup)


class PrivateCleanupTests(unittest.TestCase):
    target = "0123456789abcdef01234567"

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        self.workspace = self.root / "workspace"
        self.workspace.mkdir(mode=0o700)
        (self.workspace / ".ys-sys-001-target-id").write_text(self.target)
        self.artifact = self.root / "approved.dump.age"
        self.artifact.write_bytes(b"synthetic encrypted artifact fixture")

    def tearDown(self):
        self.tmp.cleanup()

    def test_artifact_identity_includes_inode_size_mtime_and_digest(self):
        before = cleanup.artifact_identity(self.artifact)
        self.assertEqual(before, cleanup.artifact_identity(self.artifact))
        self.artifact.write_bytes(b"changed")
        self.assertNotEqual(before, cleanup.artifact_identity(self.artifact))

    def test_record_artifact_is_private_and_refuses_replacement(self):
        (self.workspace / ".ys-sys-001-target-id").unlink()
        cleanup.record_artifact(self.workspace, self.target, self.artifact)
        marker = self.workspace / ".ys-sys-001-target-id"
        identity = self.workspace / ".artifact-identity.json"
        self.assertEqual(marker.stat().st_mode & 0o777, 0o600)
        self.assertEqual(identity.stat().st_mode & 0o777, 0o600)
        with self.assertRaises(cleanup.CleanupError):
            cleanup.record_artifact(self.workspace, self.target, self.artifact)

    def test_cleanup_removes_only_ephemeral_private_material_and_keeps_evidence(self):
        (self.workspace / ".ys-sys-001-target-id").unlink()
        cleanup.record_artifact(self.workspace, self.target, self.artifact)
        (self.workspace / "plaintext").mkdir()
        (self.workspace / "plaintext" / "restore.dump").write_bytes(b"synthetic plaintext")
        (self.workspace / "secrets").mkdir()
        (self.workspace / "secrets" / "runtime.env").write_text("synthetic-only")
        (self.workspace / "app-source").mkdir()
        (self.workspace / "app-source" / "source.ts").write_text("synthetic source")
        (self.workspace / "runner-source").mkdir()
        (self.workspace / "runner-source" / "test.ts").write_text("synthetic test")
        (self.workspace / "report.json").write_text('{"status":"synthetic"}')
        cleanup.cleanup_workspace(self.workspace, self.artifact)
        self.assertFalse((self.workspace / "plaintext").exists())
        self.assertFalse((self.workspace / "secrets").exists())
        self.assertFalse((self.workspace / "app-source").exists())
        self.assertFalse((self.workspace / "runner-source").exists())
        self.assertTrue((self.workspace / "report.json").exists())
        self.assertTrue(self.artifact.exists())

    def test_changed_artifact_fails_before_removing_private_evidence(self):
        (self.workspace / ".ys-sys-001-target-id").unlink()
        cleanup.record_artifact(self.workspace, self.target, self.artifact)
        (self.workspace / "plaintext").mkdir()
        self.artifact.write_bytes(b"tampered")
        with self.assertRaises(cleanup.CleanupError):
            cleanup.cleanup_workspace(self.workspace, self.artifact)
        self.assertTrue((self.workspace / "plaintext").exists())

    def test_workspace_requires_private_mode_and_matching_marker(self):
        cleanup.validate_workspace(self.workspace, self.target)
        (self.workspace / ".ys-sys-001-target-id").write_text("f" * 24)
        with self.assertRaises(cleanup.CleanupError):
            cleanup.validate_workspace(self.workspace, self.target)

    def test_removes_only_prevalidated_resources_in_dependency_order(self):
        ids = {"container": ["c1"], "network": ["n1"], "volume": ["v1"], "image": ["i1"]}
        removed = []

        def fake_docker(args, check=True):
            if args == ["context", "show"]:
                return "thinkpad-wsl"
            if args[0] in ("ps", "network", "volume", "image") and "--filter" in args:
                kind = "container" if args[0] == "ps" else args[0]
                return "\n".join(ids[kind])
            if args[0] == "inspect" or args[:2] in (["network", "inspect"], ["volume", "inspect"], ["image", "inspect"]):
                return "{}"
            removed.append(tuple(args))
            if args[0] == "rm":
                ids["container"].remove(args[-1])
            elif args[0] in ("network", "volume", "image") and args[1] == "rm":
                ids[args[0]].remove(args[-1])
            return ""

        with patch.object(cleanup, "docker", side_effect=fake_docker), patch.object(cleanup, "inspect_label") as verify:
            cleanup.remove_resources(self.target, "thinkpad-wsl")
        self.assertEqual(verify.call_count, 4)
        self.assertEqual(removed, [("rm", "--force", "--volumes", "c1"), ("network", "rm", "n1"),
                                   ("volume", "rm", "v1"), ("image", "rm", "i1")])
        self.assertFalse(any("prune" in arg for command in removed for arg in command))

    def test_label_mismatch_stops_before_any_removal(self):
        removed = []
        with patch.object(cleanup, "resource_ids", side_effect=lambda kind, _: ["unowned"] if kind == "container" else []), \
             patch.object(cleanup, "inspect_label", side_effect=cleanup.CleanupError("unverified")), \
             patch.object(cleanup, "docker", side_effect=lambda args, **_: "thinkpad-wsl" if args == ["context", "show"] else removed.append(args) or ""):
            with self.assertRaises(cleanup.CleanupError):
                cleanup.remove_resources(self.target, "thinkpad-wsl")
        self.assertEqual(removed, [])

    def test_docker_context_mismatch_stops_before_resource_listing(self):
        with patch.object(cleanup, "docker", return_value="default") as call:
            with self.assertRaises(cleanup.CleanupError):
                cleanup.remove_resources(self.target, "thinkpad-wsl")
        self.assertEqual(call.call_args_list, [unittest.mock.call(["context", "show"])])

    def test_cleanup_docker_calls_pin_the_explicit_context(self):
        with patch.object(cleanup.subprocess, "run", return_value=type("Result", (), {"stdout": "ok", "returncode": 0})()) as run:
            cleanup.ACTIVE_CONTEXT = "thinkpad-wsl"
            self.assertEqual(cleanup.docker(["ps", "-aq"]), "ok")
        self.assertEqual(run.call_args.args[0], ["docker", "--context", "thinkpad-wsl", "ps", "-aq"])

    def test_existing_resource_name_is_not_accepted_by_target_label_alone(self):
        payload = [{"Name": "/ys-sys-001-original-recovery-container",
                    "Config": {"Labels": {cleanup.LABEL: self.target}}}]
        with patch.object(cleanup, "docker", return_value=json.dumps(payload)):
            with self.assertRaises(cleanup.CleanupError):
                cleanup.inspect_label("container", "existing-id", self.target)

    def test_symlink_artifact_is_rejected(self):
        link = self.root / "artifact-link"
        link.symlink_to(self.artifact)
        with self.assertRaises(cleanup.CleanupError):
            cleanup.artifact_identity(link)


if __name__ == "__main__":
    unittest.main()
