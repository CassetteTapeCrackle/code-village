"""The model jobs: results through the job log, with no network and recorded responses."""

import base64
import contextlib
import io
import tempfile
import unittest
from pathlib import Path

from vet.models.logs import LogError, emit_files, extract_files


def printed(folder: Path) -> str:
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        emit_files(folder)
    return out.getvalue()


class ResultsInTheLog(unittest.TestCase):
    def test_files_round_trip_through_a_log_with_timestamps(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / "sub").mkdir()
            (folder / "a.json").write_bytes(b'{"x": 1}\n')
            (folder / "sub" / "big.bin").write_bytes(bytes(range(256)) * 40)
            log = "".join(f"2026-11-03T23:54:20.4858874Z {line}\n" for line in printed(folder).splitlines())
        found = extract_files("﻿" + log)
        self.assertEqual(found, {"a.json": b'{"x": 1}\n', "sub/big.bin": bytes(range(256)) * 40})

    def test_a_changed_line_fails_the_checksum(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "a.json").write_bytes(b"data")
            log = printed(Path(tmp)).replace(base64.b64encode(b"data").decode(), base64.b64encode(b"dat4").decode())
        with self.assertRaisesRegex(LogError, "checksum"):
            extract_files(log)

    def test_a_cut_off_log_is_refused(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "a.json").write_bytes(b"data")
            log = printed(Path(tmp)).replace("VET-FILE-END a.json", "")
        with self.assertRaisesRegex(LogError, "not complete"):
            extract_files(log)


if __name__ == "__main__":
    unittest.main()
