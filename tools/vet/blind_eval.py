"""Blind solvers, the session's half: build the request, run the attempts, record triage.

python -m tools.vet.blind_eval request <item id>... --out vet/requests/blind-<name>.json
python -m tools.vet.blind_eval evaluate <blind-raw.json> --out vet/blind
python -m tools.vet.blind_eval triage <item id> <attempt> <decision> --note "..." [--by owner]

The model's code is run, never trusted: through the visible tests and hidden cases of every suite of the item, and,
when both pass, against the 2000-input fuzz set the mutation check uses.
"""

import argparse
import json
import sys
from collections.abc import Mapping, Sequence
from pathlib import Path

from .adapter import CheckJob, CheckOutcome, LanguageAdapter
from .cache import Group
from .cases.expect import buildable_cases
from .checks.blind import DECIDERS, DECISIONS
from .checks.mutation import FUZZ_COUNT, difference
from .load import load_content
from .model import CodeBlock, Content, TaskBlock, TextBlock
from .python.adapter import PythonAdapter

BLIND_DIR = Path("vet") / "blind"
TRIAGE_FILE = Path("vet") / "triage.md"


def group_id(group: Group) -> str:
    return group[0].id


def lesson_text_before(content: Content) -> dict[str, tuple[str, str]]:
    """For each task and variant id: the lesson as a learner has read it when they reach the task, and its prompt."""
    found: dict[str, tuple[str, str]] = {}
    for lesson in content.lessons:
        read: list[str] = []
        for block in lesson.blocks:
            if isinstance(block, TextBlock):
                read.append(block.markdown)
            elif isinstance(block, CodeBlock) and block.kind != "claim":
                read.append(f"```python\n{block.code}```")
            elif isinstance(block, TaskBlock):
                context = "\n\n".join(read)
                found[block.task.id] = (context, str(block.task.meta.get("prompt", "")))
                found.update({v.id: (context, str(v.meta.get("prompt", ""))) for v in block.task.variants})
    return found


def question_for(group: Group, read: Mapping[str, tuple[str, str]]) -> dict[str, str]:
    """What the solver gets: the lesson text so far, the prompt and the starter; never tests or a solution.
    A boss has no lesson text here: its intro and stage prompts stand in for the prompt."""
    first = group[0]
    context, prompt = read.get(first.id, ("", first.prompt))
    if first.kind in ("stage", "hard"):
        stages = [f"Stage {n}: {item.prompt}" for n, item in enumerate((i for i in group if i.kind == "stage"), 1)]
        prompt = "\n\n".join([next(i.prompt for i in group if i.kind == "hard"), *stages])
    return {"id": first.id, "fingerprint": first.fingerprint, "context": context or "(no lesson text)",
            "prompt": prompt, "starter": first.starter}


def build_request(content: Content, ids: Sequence[str]) -> dict[str, object]:
    groups = {group_id(g): g for g in content.solution_groups()}
    unknown = [i for i in ids if i not in groups]
    if unknown:
        raise KeyError(f"no task, variant or boss with the id {', '.join(unknown)}")
    read = lesson_text_before(content)
    return {"job": "blind", "items": [question_for(groups[i], read) for i in ids]}


def _first_failure(outcomes: Sequence[CheckOutcome | None], hidden: bool) -> str:
    """The message of the first failing visible test (hidden False) or hidden case (hidden True), else ''."""
    for outcome in outcomes:
        if outcome is None:
            return "it runs out of time"
        if outcome["error"] and not hidden:
            return outcome["error"]
        for result in outcome["results"]:
            if result["hidden"] == hidden and not result["passed"]:
                return result["message"] if hidden else f"{result['name']}: {result['message']}"
    return ""


def judge_attempt(group: Group, code: str, adapter: LanguageAdapter) -> dict[str, str]:
    """visible and hidden verdicts for one attempt over every suite of the group, the failing case, and the fuzz
    verdict when it passes both. `hidden` is "none" for an item without hidden cases."""
    suites = [(item, buildable_cases(item, adapter)) for item in group]
    outcomes = adapter.check([CheckJob(code, item.tests, item.strict, cases, item.requires) for item, cases in suites])
    failure, case = _first_failure(outcomes, False), _first_failure(outcomes, True)
    has_cases = any(cases for _, cases in suites)
    judged = {"code": code, "visible": "fail" if failure else "pass",
              "hidden": ("fail" if case else "pass") if has_cases else "none",
              "failure": failure, "case": case, "fuzz": "none", "input": ""}
    if failure or case:
        return judged
    fuzz = [(item, buildable_cases(item, adapter, fuzz=FUZZ_COUNT)) for item in group]
    fuzz = [(item, cases) for item, cases in fuzz if cases]
    ran = adapter.check([CheckJob(code, item.tests, item.strict, cases, item.requires) for item, cases in fuzz])
    differences = [d for d in map(difference, ran) if d]
    if fuzz:
        judged.update({"fuzz": "differs" if differences else "agree", "input": differences[0] if differences else ""})
    return judged


def evaluate(content: Content, raw: Mapping[str, object], adapter: LanguageAdapter) -> dict[str, dict[str, object]]:
    """The result file of every item in the raw attempts, by item id. An attempt the model failed to give
    (`error`) is kept out; a file with no attempt left is not written."""
    groups = {group_id(g): g for g in content.solution_groups()}
    results: dict[str, dict[str, object]] = {}
    items = raw["items"]
    if not isinstance(items, list):
        raise ValueError("the raw attempts have no items list")
    for solved in items:
        group = groups.get(str(solved["id"]))
        if group is None or str(solved["fingerprint"]) != group[0].fingerprint:
            raise ValueError(f"{solved['id']}: the content changed since the request was made: ask again")
        attempts = [judge_attempt(group, a["code"], adapter) | {"temperature": a["temperature"]}
                    for a in solved["attempts"] if not a["error"]]
        if attempts:
            results[group_id(group)] = {"fingerprint": group[0].fingerprint, "model": raw.get("model", ""),
                                        "attempts": attempts, "triage": []}
    return results


def add_triage(path: Path, attempt: int, decision: str, by: str, note: str) -> None:
    data = json.loads(path.read_text())
    if decision not in DECISIONS or by not in DECIDERS:
        raise ValueError(f"decision is one of {', '.join(DECISIONS)} and by one of {', '.join(DECIDERS)}")
    if not 0 <= attempt < len(data["attempts"]):
        raise ValueError(f"attempt {attempt} does not exist")
    if decision == "model-wrong":
        shown = data["attempts"][attempt]["case"] or data["attempts"][attempt]["failure"]
        if shown not in note:
            raise ValueError("a model-wrong decision must quote the failing case in the note: " + shown)
    data["triage"] = [t for t in data["triage"] if t["attempt"] != attempt]
    data["triage"].append({"attempt": attempt, "decision": decision, "by": by, "note": note})
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main(argv: Sequence[str] | None = None) -> None:
    args = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    args.add_argument("--content", type=Path, default=Path("content"))
    commands = args.add_subparsers(dest="command", required=True)
    ask = commands.add_parser("request")
    ask.add_argument("ids", nargs="+")
    ask.add_argument("--out", type=Path, required=True)
    run = commands.add_parser("evaluate")
    run.add_argument("raw", type=Path)
    run.add_argument("--out", type=Path, default=BLIND_DIR)
    mark = commands.add_parser("triage")
    mark.add_argument("id")
    mark.add_argument("attempt", type=int)
    mark.add_argument("decision")
    mark.add_argument("--note", required=True)
    mark.add_argument("--by", default="session")
    mark.add_argument("--dir", type=Path, default=BLIND_DIR)
    mark.add_argument("--triage-file", type=Path, default=TRIAGE_FILE)
    opts = args.parse_args(argv)
    if opts.command == "triage":
        add_triage(opts.dir / f"{opts.id}.json", opts.attempt, opts.decision, opts.by, opts.note)
        if opts.by == "session":
            with opts.triage_file.open("a") as listing:
                listing.write(f"\n## blind: {opts.id}, attempt {opts.attempt} <!-- session triage -->\n\n"
                              f"- decision: {opts.decision} (by the session)\n- note: {opts.note}\n")
        print(f"blind: triaged {opts.id} attempt {opts.attempt} as {opts.decision}")
        return
    content, _ = load_content(opts.content)
    if opts.command == "request":
        try:
            request = build_request(content, opts.ids)
        except KeyError as e:
            sys.exit(f"blind: {e.args[0]}")
        opts.out.write_text(json.dumps(request, indent=2, ensure_ascii=False) + "\n")
        print(f"blind: request for {len(opts.ids)} item(s) -> {opts.out}")
        return
    results = evaluate(content, json.loads(opts.raw.read_text()), PythonAdapter())
    opts.out.mkdir(parents=True, exist_ok=True)
    for item, result in results.items():
        (opts.out / f"{item}.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(f"blind: {len(results)} result file(s) -> {opts.out}")


if __name__ == "__main__":
    main()
