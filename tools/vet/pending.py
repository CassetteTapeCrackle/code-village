"""python -m tools.vet.pending <out.json>: the sentences without a current ledger entry, with their paragraphs."""

import argparse
import json
from pathlib import Path

from .load import load_content
from .prose import pending_sentences


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("out", help="where to write the list (JSON)")
    args.add_argument("--content", default="content", help="the content folder (default content)")
    opts = args.parse_args()
    content, _ = load_content(Path(opts.content))
    pending = pending_sentences(content)
    Path(opts.out).write_text(json.dumps(pending, indent=2, ensure_ascii=False) + "\n")
    print(f"ledger: {len(pending)} sentence(s) without a current entry -> {opts.out}")


if __name__ == "__main__":
    main()
