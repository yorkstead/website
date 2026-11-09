"""Unit tests for the private monotonic rehearsal clock."""

import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest


SCRIPT = pathlib.Path(__file__).with_name("private-rehearsal-clock.py")


class PrivateRehearsalClockTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.directory = pathlib.Path(self.temp.name)
        os.chmod(self.directory, 0o700)
        self.state = self.directory / "clock.json"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def run_clock(self, action: str, *, success: bool = True) -> dict | subprocess.CompletedProcess[str]:
        result = subprocess.run(
            [sys.executable, str(SCRIPT), action, "--state", str(self.state)],
            capture_output=True,
            text=True,
            check=False,
        )
        if not success:
            self.assertNotEqual(result.returncode, 0, result.stdout)
            return result
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_failed_readiness_still_records_separate_cleanup_timestamp(self) -> None:
        self.run_clock("start")
        result = self.run_clock("cleanup-verified")
        self.assertEqual(result["cleanup"], "VERIFIED")
        self.assertEqual(result["readiness"], "NOT_REACHED")
        self.assertFalse(result["rtoPass"])
        self.assertIn("tCleanupVerifiedUtc", json.loads(self.state.read_text()))
        self.assertNotIn("tReadyUtc", json.loads(self.state.read_text()))

    def test_ready_and_cleanup_are_distinct_and_cleanup_does_not_change_rto(self) -> None:
        self.run_clock("start")
        ready = self.run_clock("ready")
        cleanup = self.run_clock("cleanup-verified")
        self.assertIn("TReady", ready)
        self.assertIn("TCleanupVerified", cleanup)
        self.assertEqual(cleanup["rtoSeconds"], ready["elapsedSeconds"])

    def test_clock_cannot_restart_or_record_cleanup_twice(self) -> None:
        self.run_clock("start")
        self.run_clock("start", success=False)
        self.run_clock("cleanup-verified")
        self.run_clock("cleanup-verified", success=False)

    def test_reboot_cleanup_marks_continuous_rto_invalid(self) -> None:
        self.run_clock("start")
        state = json.loads(self.state.read_text())
        state["bootId"] = "prior-boot"
        self.state.write_text(json.dumps(state))
        os.chmod(self.state, 0o600)
        result = self.run_clock("cleanup-after-reboot")
        self.assertEqual(result["continuousRto"], "INVALID_AFTER_REBOOT")
        self.assertEqual(result["cleanup"], "VERIFIED")


if __name__ == "__main__":
    unittest.main()
