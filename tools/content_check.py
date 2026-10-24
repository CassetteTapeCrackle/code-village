"""Check every lesson and boss and write the app's content bundle.

Runs each solution and starter against its tests, and each example, with py/harness.py in a
subprocess (30 s limit), several lessons at once. Any problem is printed as one line and the build fails.
World 3 needs NumPy, pandas and scikit-learn at the versions Pyodide ships: `pnpm content` runs this under uv.

Three guards against teaching something wrong (content/README.md explains how to write content):
- a ```python claim``` block in a lesson backs the sentence above it with asserts; it runs here and is never shown.
- wrong/*.py next to a solution (task, variant or boss) is a plausible mistake the tests must catch.
- every solution.py passes ruff (LINT_RULES), so model answers show good habits.
With --if-changed it skips everything when the bundle was built from these exact inputs (what `pnpm dev` uses).
Usage: python3 tools/content_check.py [--content DIR] [--out FILE] [--no-version-check] [--if-changed]
"""

import argparse
import builtins
import hashlib
import importlib.metadata
import io
import json
import keyword
import os
import re
import subprocess
import sys
import tokenize
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HARNESS = ROOT / "py" / "harness.py"
PYODIDE_LOCK = ROOT / "node_modules" / "pyodide" / "pyodide-lock.json"
# ignored: zip(strict=) is not taught, and assert False is how the testing lessons fail a test by hand
LINT_RULES = ["--select", "E,F,W,B,SIM", "--ignore", "E501,B905,B011"]
# a guard against runaway loops, not a speed budget: World 3 runs take ~2 s alone but 10+ s on a loaded machine
LIMIT = 30
LIBRARIES = ("numpy", "pandas", "scikit-learn")  # what World 3 imports, checked against the Pyodide lock
LESSON_FIELDS = {"id": str, "title": str, "world": str, "region": str, "order": int, "concepts": list, "remember": list, "loot": dict}
TASK_FIELDS = {"id": str, "concept": str, "kind": str, "title": str, "prompt": str, "hints": list, "gotcha": bool}
VARIANT_FIELDS = {"id": str, "title": str, "prompt": str}
BOSS_FIELDS = {"id": str, "title": str, "world": str, "region": str, "hard_checks": int, "trophy": dict, "hard_trophy": dict}
STAGE_FIELDS = {"id": str, "title": str, "prompt": str, "hp": int}
WORLD_FIELDS = {"id": str, "order": int, "name": str, "area": str, "regions": dict, "building": dict, "teacher": dict}
BUILDING_FIELDS = {"name": str, "place": str}
TEACHER_FIELDS = {"name": str, "portrait": str}
KEY_FIELDS = {"boss": str, "trophy": str, "trophy_name": str, "opens": str, "gate_hint": str}
CODE_FILES = ("starter", "solution", "tests")
KINDS = {"write", "fix", "complete"}
FENCE = re.compile(r"^```python (example|predict|claim)\n(.*?)^```\n", re.S | re.M)
TASK_LINE = re.compile(r"^::task ([\w-]+)\s*$", re.M)
HINT_CODE = re.compile(r"`([^`]+)`")
# A hint often shows half a statement: wrap it in each context it could come from and accept it if one compiles.
HINT_WRAPS = (
    "{s}", "{s}\n    pass", "{s}\nclass _C: pass",
    "if _x:\n    pass\n{s}\n    pass", "try:\n    pass\n{s}\n    pass", "for _ in _:\n    {s}",
    "def _f():\n    {s}", "def _f():\n    {s}\n        pass", "def _f():\n    {s}\n    except Exception:\n        pass",
    "def _f():\n    if _x:\n        pass\n    {s}", "def _f():\n    try:\n        pass\n    {s}",
    "def _f():\n    for _ in _:\n        {s}",
    "_x {s}", "_d = {{s}}",
)
# `_y` glued after the span finishes a fragment: a bare operator (`*`, `==`, `+`), a keyword-argument
# prefix (`key=`) or a half element (`x,`). It must not finish a whole statement, or `x = 1 +` would
# parse as the keyword argument `x=1+_y` and pass. So only a span with no space, or one ending in a
# comma, takes the glue.
GLUE_WRAPS = ("_x {s} _y", "_f(_x, {s}_y)")
SKIP_TOKENS = {tokenize.NL, tokenize.NEWLINE, tokenize.INDENT, tokenize.DEDENT, tokenize.ENDMARKER,
               tokenize.COMMENT}
BUILTINS = set(dir(builtins))


def takes_glue(span):
    return not any(c.isspace() for c in span) or span.rstrip().endswith(",")


class Problems(list):
    def add(self, where, text):
        self.append(f"{where}: {text}")


def harness(job):
    try:
        # one maths thread per job: the jobs already run side by side, one per CPU
        done = subprocess.run([sys.executable, "-I", str(HARNESS)], input=json.dumps(job), capture_output=True,
                              text=True, timeout=LIMIT, env={**os.environ, "OMP_NUM_THREADS": "1", "OPENBLAS_NUM_THREADS": "1"})
    except subprocess.TimeoutExpired:
        return None
    if done.returncode != 0:  # e.g. the task's own tests.py has a syntax error
        last = (done.stderr.strip().splitlines() or ["no output"])[-1]
        return {"stdout": "", "error": f"the harness crashed: {last}", "results": []}
    return json.loads(done.stdout)


def passes(result):
    return bool(result and not result["error"] and result["results"] and all(r["passed"] for r in result["results"]))


def check_solution(item_id, code, tests, problems, what="the solution", strict=False):
    done = harness({"mode": "check", "code": code, "tests": tests, "strict": strict})
    if done is None:
        problems.add(item_id, f"{what} ran longer than {LIMIT} s")
    elif not passes(done):
        problems.add(item_id, f"{what} fails: {done['error'] or [r for r in done['results'] if not r['passed']]}")


def check_starter(item_id, code, tests, problems, strict=False):
    if passes(harness({"mode": "check", "code": code, "tests": tests, "strict": strict})):
        problems.add(item_id, "the starter already passes every test (the task is trivial)")


def check_wrong(item_id, folder, suites, problems):
    """Each wrong/*.py is a mistake a learner could make: some test in the suites must fail it."""
    for wrong in sorted((folder / "wrong").glob("*.py")):
        code = wrong.read_text()
        if all(passes(harness({"mode": "check", "code": code, "tests": tests, "strict": strict}))
               for tests, strict in suites):
            problems.add(item_id, f"wrong/{wrong.name} passes every test: the tests miss that mistake")


def looks_like_code(span):
    """A lone word or a file name in backticks is prose, not code to check."""
    return " " in span.strip() or any(c in span for c in "()[]{}=:<>+-*/%'\"")


def hint_code_compiles(span):
    # a format spec like {total:.2f} only makes sense inside an f-string
    wraps = HINT_WRAPS + (('f"{s}"',) if span.startswith("{") else ())
    if takes_glue(span):
        wraps += GLUE_WRAPS
    for text in (span, span + ":"):
        for wrap in wraps:
            try:
                compile(wrap.replace("{s}", text), "<hint>", "exec")  # replace, not format: hints hold braces
                return True
            except SyntaxError:
                continue
    return False


def squeeze(code):
    """Code with every space gone, so a hint cannot dodge the check by reformatting a line."""
    return "".join(code.split())


def renamed_shape(code):
    """A token sequence where each name becomes v1, v2... in first-seen order.

    Keywords, builtins and attribute names after a dot keep their name, as do operators and literals,
    so a consistent rename of the solution keeps the same sequence and a different operation does not.
    None means the fragment cannot be tokenized.
    """
    names = {}
    kept = []
    previous = ""
    try:
        for tok in tokenize.generate_tokens(io.StringIO(code).readline):
            if tok.type in SKIP_TOKENS:
                continue
            if (tok.type == tokenize.NAME and not keyword.iskeyword(tok.string)
                    and tok.string not in BUILTINS and previous != "."):
                kept.append(names.setdefault(tok.string, f"v{len(names) + 1}"))
            else:
                kept.append(tok.string)
            previous = tok.string
    except (tokenize.TokenError, IndentationError):
        return None
    return tuple(kept)


STRING_TOKENS = {tokenize.STRING}
for _string_token in ("FSTRING_START", "FSTRING_MIDDLE", "FSTRING_END"):
    if hasattr(tokenize, _string_token):
        STRING_TOKENS.add(getattr(tokenize, _string_token))


def masked_shape(code):
    """A token sequence with every name, attribute, string and number replaced by a placeholder.

    Keywords, builtins, operators and punctuation keep their spelling, so a hint that only renames
    names, attributes, strings or numbers still matches the solution line it copies. None means the
    fragment cannot be tokenized.
    """
    names = {}
    kept = []
    try:
        for tok in tokenize.generate_tokens(io.StringIO(code).readline):
            if tok.type in SKIP_TOKENS:
                continue
            if tok.type == tokenize.NAME and not keyword.iskeyword(tok.string) and tok.string not in BUILTINS:
                kept.append(names.setdefault(tok.string, f"v{len(names) + 1}"))
            elif tok.type in STRING_TOKENS:
                kept.append("s")
            elif tok.type == tokenize.NUMBER:
                kept.append("n")
            else:
                kept.append(tok.string)
    except (tokenize.TokenError, IndentationError):
        return None
    return tuple(kept)


def giveaway_lines(solution, starter):
    """The solution lines a hint must not quote: short ones and ones the starter already shows teach nothing."""
    shown = {squeeze(line) for line in starter.splitlines()}
    return [line.strip() for line in solution.splitlines()
            if not line.strip().startswith("#") and len(squeeze(line)) >= 8 and squeeze(line) not in shown]


def check_hints(item_id, hints, solution, starter, problems):
    # Review sessions show a task's variants without hints, so only the task's own solution matters.
    shown = {squeeze(line) for line in starter.splitlines()}
    answers = giveaway_lines(solution, starter)
    quoted = {squeeze(line) for line in answers}
    shapes = {renamed: line for line in answers if (renamed := renamed_shape(line))}
    masked = {masked: line for line in answers if (masked := masked_shape(line)) and len(masked) >= 4}
    for number, hint in enumerate(hints, 1):
        if not isinstance(hint, str):
            problems.add(item_id, "a hint must be a string")
            continue
        for span in HINT_CODE.findall(hint):
            if looks_like_code(span) and not hint_code_compiles(span):
                problems.add(item_id, f"hint code is not valid Python: `{span}`")
            if squeeze(span) in quoted:
                problems.add(item_id, f"hint {number} gives away the solution: `{span}`")
            elif len(squeeze(span)) >= 8 and squeeze(span) not in shown and (line := shapes.get(renamed_shape(span))):
                problems.add(item_id, f"hint {number} gives away the solution: `{span}` is `{line}` renamed")
            elif (shape := masked_shape(span)) and len(shape) >= 4 and (line := masked.get(shape)):
                problems.add(item_id, f"hint {number} gives away the solution: `{span}` is `{line}` with names, strings or numbers changed")


def check_claim(where, code, problems):
    if "assert" not in code:
        problems.add(where, "a claim block needs an assert")
        return
    ran = harness({"mode": "run", "code": code, "inputs": []})
    if ran is None:
        problems.add(where, f"a claim block ran longer than {LIMIT} s")
    elif ran["error"]:
        problems.add(where, f"a claim is false: {ran['error']}")


def check_style(content, problems):
    """Model solutions are what learners copy: they must pass the linter."""
    solutions = sorted(str(p) for p in content.rglob("solution.py"))
    try:
        done = subprocess.run([sys.executable, "-m", "ruff", "check", "--isolated", "--no-cache", "--output-format", "concise",
                               *LINT_RULES, *solutions], capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired:
        problems.add("lint", "ruff ran longer than 60 s")
        return
    if "No module named ruff" in done.stderr:
        problems.add("lint", "ruff is missing: run the check with pnpm content")
        return
    if done.returncode not in (0, 1):  # 1 means rules were broken, anything else means ruff itself failed
        problems.add("lint", f"ruff failed: {(done.stderr.strip().splitlines() or ['no output'])[-1]}")
        return
    for line in done.stdout.splitlines():
        path, sep, rest = line.partition(".py:")
        if sep:
            problems.add(str(Path(path + ".py").relative_to(content)), f"the solution breaks a lint rule: {rest}")


def require(meta, fields, where, source, problems):
    for field, kind in fields.items():
        if not isinstance(meta.get(field), kind):
            problems.add(where, f"{source} field {field} missing or not a {kind.__name__}")


def read_folder(folder, toml_name, code_names, where, problems):
    """A folder's TOML file and .py files, or (None, None) after reporting why not."""
    try:
        meta = tomllib.loads((folder / toml_name).read_text())
        files = {name: (folder / f"{name}.py").read_text() for name in code_names}
    except (OSError, tomllib.TOMLDecodeError) as e:
        problems.add(where, f"unreadable {toml_name} folder: {e}")
        return None, None
    return meta, files


def subfolders(folder):
    return sorted(p for p in folder.iterdir() if p.is_dir()) if folder.is_dir() else []


def front_matter(text, where, fields, problems):
    parts = text.split("+++\n")
    if len(parts) < 3 or parts[0] != "":
        problems.add(where, "must start with +++ front matter")
        return None, ""
    meta = tomllib.loads(parts[1])
    require(meta, fields, where, "front matter", problems)
    return meta, "+++\n".join(parts[2:])


def split_body(body):
    """Text, example, predict and task blocks, in order."""
    blocks, pos = [], 0
    pattern = re.compile(FENCE.pattern + "|" + TASK_LINE.pattern, re.S | re.M)
    for m in pattern.finditer(body):
        text = body[pos:m.start()].strip()
        if text:
            blocks.append({"type": "text", "markdown": text})
        if m.group(1):
            blocks.append({"type": m.group(1), "code": m.group(2)})
        else:
            blocks.append({"type": "task", "folder": m.group(3)})
        pos = m.end()
    tail = body[pos:].strip()
    if tail:
        blocks.append({"type": "text", "markdown": tail})
    return blocks


def load_variant(folder, concept, problems):
    where = f"{folder.parents[1].name}/variants/{folder.name}"
    meta, files = read_folder(folder, "variant.toml", CODE_FILES, where, problems)
    if meta is None:
        return None
    require(meta, VARIANT_FIELDS, where, "variant.toml", problems)
    strict = meta.get("strict", False)
    if not isinstance(strict, bool):
        problems.add(where, "strict must be true or false")
    variant_id = meta.get("id", where)
    check_solution(variant_id, files["solution"], files["tests"], problems, strict=strict)
    check_starter(variant_id, files["starter"], files["tests"], problems, strict=strict)
    check_wrong(variant_id, folder, [(files["tests"], strict)], problems)
    return {**{k: meta.get(k) for k in VARIANT_FIELDS}, "concept": concept, "strict": strict,
            "starter": files["starter"], "tests": files["tests"]}


def load_task(folder, problems):
    where = f"{folder.parent.parent.name}/{folder.name}"
    meta, files = read_folder(folder, "task.toml", CODE_FILES, where, problems)
    if meta is None:
        return None
    require(meta, TASK_FIELDS, where, "task.toml", problems)
    if meta.get("kind") not in KINDS:
        problems.add(where, f"kind must be one of {sorted(KINDS)}")
    if not meta.get("hints"):
        problems.add(where, "a task needs at least one hint")
    strict = meta.get("strict", False)
    if not isinstance(strict, bool):
        problems.add(where, "strict must be true or false")
    check_hints(meta.get("id", where), meta.get("hints") or [], files["solution"], files["starter"], problems)
    task_id = meta.get("id", where)
    check_solution(task_id, files["solution"], files["tests"], problems, strict=strict)
    check_starter(task_id, files["starter"], files["tests"], problems, strict=strict)
    check_wrong(task_id, folder, [(files["tests"], strict)], problems)
    variants = [v for d in subfolders(folder / "variants") if (v := load_variant(d, meta.get("concept"), problems))]
    return {**{k: meta.get(k) for k in TASK_FIELDS}, "strict": strict,
            "starter": files["starter"], "tests": files["tests"], "variants": variants}


def load_lesson(lesson_md, problems):
    where = str(lesson_md.parent.relative_to(lesson_md.parents[3]))
    meta, body = front_matter(lesson_md.read_text(), where, LESSON_FIELDS, problems)
    if meta is None:
        return None
    if "tour" in meta and not isinstance(meta["tour"], bool):
        problems.add(where, "tour must be true or false")
    blocks = []
    placed = set()
    for block in split_body(body):
        if block["type"] == "claim":
            check_claim(where, block["code"], problems)
        elif block["type"] in ("example", "predict"):
            ran = harness({"mode": "run", "code": block["code"], "inputs": []})
            if ran is None:
                problems.add(where, f"this {block['type']} block ran longer than {LIMIT} s")
                continue
            if ran["error"]:
                problems.add(where, f"this {block['type']} block raised: {ran['error']}")
            if block["type"] == "predict" and not ran["stdout"]:
                problems.add(where, "a predict block prints nothing")
            blocks.append({"type": block["type"], "code": block["code"], "output": ran["stdout"]})
        elif block["type"] == "task":
            folder = lesson_md.parent / "tasks" / block["folder"]
            if not folder.is_dir():
                problems.add(where, f"::task {block['folder']} has no folder")
                continue
            placed.add(block["folder"])
            task = load_task(folder, problems)
            if task:
                blocks.append({"type": "task", "task": task})
        else:
            blocks.append(block)
    for folder in subfolders(lesson_md.parent / "tasks"):
        if folder.name not in placed:
            problems.add(where, f"task folder {folder.name} is never placed with ::task")
    lesson = {**{k: meta.get(k) for k in LESSON_FIELDS}, "blocks": blocks}
    if meta.get("tour"):
        lesson["tour"] = True
    return lesson


def load_boss(boss_md, problems):
    folder = boss_md.parent
    where = str(folder.relative_to(boss_md.parents[3]))
    meta, intro = front_matter(boss_md.read_text(), where, BOSS_FIELDS, problems)
    if meta is None:
        return None
    try:
        files = {name: (folder / f"{name}.py").read_text() for name in ("starter", "solution", "hard_tests")}
    except OSError as e:
        problems.add(where, f"unreadable boss files: {e}")
        return None
    stages = []
    for d in subfolders(folder / "stages"):
        stage_where = f"{where}/stages/{d.name}"
        stage_meta, stage_files = read_folder(d, "stage.toml", ("tests",), stage_where, problems)
        if stage_meta is None:
            continue
        require(stage_meta, STAGE_FIELDS, stage_where, "stage.toml", problems)
        stages.append({**{k: stage_meta.get(k) for k in STAGE_FIELDS}, "tests": stage_files["tests"]})
    if not 3 <= len(stages) <= 5:
        problems.add(where, f"a boss needs 3 to 5 stages, found {len(stages)}")
    boss_id = meta.get("id", where)
    for stage in stages:
        check_solution(boss_id, files["solution"], stage["tests"], problems, f"the solution (stage {stage['id']})")
    check_solution(boss_id, files["solution"], files["hard_tests"], problems, "the solution (hard mode)")
    check_wrong(boss_id, folder, [(s["tests"], False) for s in stages] + [(files["hard_tests"], False)], problems)
    if stages:
        check_starter(boss_id, files["starter"], stages[0]["tests"], problems)
    return {"id": boss_id, "title": meta.get("title"), "world": meta.get("world"), "region": meta.get("region"),
            "intro": intro.strip(), "starter": files["starter"], "hardTests": files["hard_tests"],
            "hardChecks": meta.get("hard_checks"), "trophy": meta.get("trophy"), "hardTrophy": meta.get("hard_trophy"),
            "stages": stages}


def all_tasks(lessons):
    return [b["task"] for lesson in lessons for b in lesson["blocks"] if b["type"] == "task"]


def load_concepts(content, problems):
    """content/concepts.toml: the readable name of every concept."""
    where = "concepts.toml"
    try:
        names = tomllib.loads((content / "concepts.toml").read_text())
    except OSError:
        problems.add(where, "missing: every concept needs a name")
        return {}
    except tomllib.TOMLDecodeError as e:
        problems.add(where, f"unreadable: {e}")
        return {}
    for concept, name in names.items():
        if not isinstance(name, str) or not name.strip():
            problems.add(where, f"concept {concept} needs a name")
    return {concept: name for concept, name in names.items() if isinstance(name, str) and name.strip()}


def check_concepts(lessons, names, problems):
    tasks = all_tasks(lessons)
    used = {c for lesson in lessons for c in lesson["concepts"]} | {t["concept"] for t in tasks}
    for concept in sorted(used - names.keys()):
        problems.add("concepts.toml", f"concept {concept} has no name")
    for concept in sorted(names.keys() - used):
        problems.add("concepts.toml", f"concept {concept} is named but no lesson or task uses it")
    for concept in sorted(used):
        mine = [t for t in tasks if t["concept"] == concept]
        if len(mine) < 3:
            problems.add("content", f"concept {concept} has {len(mine)} tasks, needs at least 3")
        if not any(t["gotcha"] for t in mine):
            problems.add("content", f"concept {concept} has no gotcha task")


def check_ids(lessons, bosses, problems):
    tasks = all_tasks(lessons)
    ids = ([lesson["id"] for lesson in lessons] + [t["id"] for t in tasks] + [v["id"] for t in tasks for v in t["variants"]]
           + [b["id"] for b in bosses] + [s["id"] for b in bosses for s in b["stages"]])
    for dup in sorted({i for i in ids if i and ids.count(i) > 1}):
        problems.add("ids", f"{dup} is used twice")


def check_bosses(bosses, lessons, problems):
    regions = {(lesson["world"], lesson["region"]) for lesson in lessons}
    seen = set()
    for boss in bosses:
        key = (boss["world"], boss["region"])
        if key not in regions:
            problems.add(boss["id"], f"region {key[0]}/{key[1]} has no lessons, so this boss can never open")
        if key in seen:
            problems.add(boss["id"], f"region {key[0]}/{key[1]} already has a boss")
        seen.add(key)


def load_world(folder, problems):
    """A world folder's world.toml: its words and wiring (the look lives in code)."""
    where = f"{folder.name}/world.toml"
    try:
        meta = tomllib.loads((folder / "world.toml").read_text())
    except OSError:
        problems.add(where, "missing: every world folder needs one")
        return None
    except tomllib.TOMLDecodeError as e:
        problems.add(where, f"unreadable: {e}")
        return None
    require(meta, WORLD_FIELDS, where, "world.toml", problems)
    require(meta.get("building") or {}, BUILDING_FIELDS, where, "[building]", problems)
    require(meta.get("teacher") or {}, TEACHER_FIELDS, where, "[teacher]", problems)
    if "key" in meta:
        require(meta["key"], KEY_FIELDS, where, "[key]", problems)
    if meta.get("id") != folder.name:
        problems.add(where, f"id must be the folder name, {folder.name}")
    return meta


def check_worlds(worlds, lessons, bosses, problems):
    """Every world is ordered once, names every region it teaches, and opens with a boss trophy from an earlier world."""
    orders = [w["order"] for w in worlds if isinstance(w.get("order"), int)]
    first = min(orders, default=None)
    for dup in sorted({o for o in orders if orders.count(o) > 1}):
        problems.add("worlds", f"order {dup} is used twice")
    by_id = {w["id"]: w for w in worlds}
    for lesson in lessons:
        world = by_id.get(lesson["world"])
        if world is None:
            problems.add(lesson["id"], f"world {lesson['world']} has no world.toml")
        elif lesson["region"] not in (world.get("regions") or {}):
            problems.add(lesson["id"], f"region {lesson['region']} has no name in {lesson['world']}/world.toml")
    trophies = {b["trophy"].get("id"): b for b in bosses}
    for world in worlds:
        key = world.get("key")
        if world.get("order") == first and key:
            problems.add(world["id"], "the first world must have no [key]: nothing could open it")
        if world.get("order") != first and not key:
            problems.add(world["id"], "needs a [key]: without one it is open from the start")
        if not key:
            continue
        boss = trophies.get(key.get("trophy"))
        if boss is None or boss["id"] != key.get("boss"):
            problems.add(world["id"], f"[key] trophy {key.get('trophy')} is not the trophy of boss {key.get('boss')}")
        elif by_id.get(boss["world"], {}).get("order", 0) >= world.get("order", 0):
            problems.add(world["id"], f"[key] boss {boss['id']} must be in an earlier world")


def world_entry(meta):
    """A world.toml as the game's World type reads it."""
    key = meta.get("key")
    return {
        "id": meta["id"], "order": meta["order"], "name": meta["name"], "area": meta["area"], "regions": meta["regions"],
        "building": {"name": meta["building"]["name"], "placeId": meta["building"]["place"]},
        "teacher": {"name": meta["teacher"]["name"], "portrait": meta["teacher"]["portrait"]},
        "key": key and {"bossId": key["boss"], "trophyId": key["trophy"], "trophyName": key["trophy_name"],
                        "opens": key["opens"], "gateHint": key["gate_hint"]},
    }


def pyodide_python():
    return json.loads(PYODIDE_LOCK.read_text())["info"]["python"]


def check_libraries(problems):
    """The checker's NumPy, pandas and scikit-learn must be the browser's, or outputs could differ."""
    packages = json.loads(PYODIDE_LOCK.read_text())["packages"]
    for name in LIBRARIES:
        wanted = packages[name]["version"]
        try:
            have = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            have = "missing"
        if have != wanted:
            problems.add("libraries", f"{name} is {have} here, Pyodide ships {wanted}: run the check with pnpm content")


def fingerprint(content):
    """A hash of everything the bundle is built from: the content, the harness, this script and the pinned versions."""
    digest = hashlib.sha256(sys.version.encode())
    files = sorted(p for p in content.rglob("*") if p.is_file() and "__pycache__" not in p.parts)
    for path in [*files, HARNESS, Path(__file__), ROOT / "package.json", PYODIDE_LOCK]:
        if path.exists():
            digest.update(str(path).encode() + b"\0" + path.read_bytes())
    return digest.hexdigest()


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--content", default=str(ROOT / "content"))
    args.add_argument("--out", default=str(ROOT / "src" / "content" / "bundle.json"))
    args.add_argument("--no-version-check", action="store_true")
    args.add_argument("--if-changed", action="store_true")
    opts = args.parse_args()
    out = Path(opts.out)
    stamp = out.with_name(out.name + ".sha256")
    source = fingerprint(Path(opts.content))
    if opts.if_changed and out.exists() and stamp.exists() and stamp.read_text() == source:
        print(f"content unchanged: kept {out}")
        return
    problems = Problems()
    python = ".".join(map(str, sys.version_info[:2]))
    if not opts.no_version_check:
        wanted = ".".join(pyodide_python().split(".")[:2])
        if python != wanted:
            problems.add("python", f"build Python is {python}, Pyodide runs {wanted}: use python{wanted}")
        check_libraries(problems)
    content = Path(opts.content)
    # the jobs are subprocesses, so threads run them side by side
    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
        lessons = [x for x in pool.map(lambda md: load_lesson(md, problems), sorted(content.glob("*/*/*/lesson.md"))) if x]
        bosses = [x for x in pool.map(lambda md: load_boss(md, problems), sorted(content.glob("*/*/boss/boss.md"))) if x]
    check_style(content, problems)
    concepts = load_concepts(content, problems)
    check_concepts(lessons, concepts, problems)
    check_ids(lessons, bosses, problems)
    check_bosses(bosses, lessons, problems)
    worlds = [w for w in (load_world(d, problems) for d in subfolders(content)) if w]
    check_worlds(worlds, lessons, bosses, problems)
    if problems:
        print("\n".join(sorted(problems)))
        print(f"content check FAILED: {len(problems)} problem(s)")
        sys.exit(1)
    lessons.sort(key=lambda lesson: (lesson["world"], lesson["order"]))
    bosses.sort(key=lambda boss: (boss["world"], boss["region"]))
    out.parent.mkdir(parents=True, exist_ok=True)
    worlds.sort(key=lambda world: world["order"])
    bundle = {"version": 3, "python": python, "concepts": dict(sorted(concepts.items())),
              "worlds": [world_entry(w) for w in worlds], "lessons": lessons, "bosses": bosses}
    out.write_text(json.dumps(bundle, indent=1))
    stamp.write_text(source)
    n_tasks = len(all_tasks(lessons))
    print(f"content ok: {len(lessons)} lesson(s), {n_tasks} task(s), {len(bosses)} boss(es) -> {out}")


if __name__ == "__main__":
    main()
