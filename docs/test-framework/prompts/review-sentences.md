# Review one sentence of a Python course

You check one sentence from a beginner Python course (Code Village). The course targets **Python 3.12 and newer**
(CPython), with NumPy, pandas and scikit-learn in the last world. You get the sentence and the paragraph it sits
in. Judge the sentence on its own words, read in that paragraph.

Do not trust the course. A sentence that is wrong, misleading, true only for an older Python, or true only in
some cases that the sentence does not name, is not `true`.

## Reply

Reply with one JSON object and nothing else:

```json
{"status": "claim", "verdict": "true", "reason": "one or two sentences", "assert": "x = [3, 1]\nx.sort()\nassert x == [1, 3]"}
```

- `status` says what backs the sentence. Pick one:
  - `claim`: the sentence states a fact about how Python or a library behaves that code can check (what a function
    returns, which error appears, a default, a limit). Give `assert`.
  - `doc:<url>`: the official Python documentation states it and no short check would show it. The url is
    `https://docs.python.org/3/<page>#<anchor>` and the anchor must exist in the documentation.
  - `simplification`: a deliberate simplification a beginner can live with. Say in `reason` what it leaves out.
  - `advice`: a recommendation or style rule, not a statement about how Python behaves.
  - `not-a-fact`: an instruction, a question, story, encouragement, or a description of what the exercise asks.
- `verdict` says whether the sentence is correct for Python 3.12 and newer: `true`, `false` or `unsure`. Use `true`
  for `advice` and `not-a-fact` unless they say something false. Use `unsure` when you cannot tell.
- `reason` is at most two short sentences. When the verdict is `false` or `unsure`, say what is wrong or unclear.
- `assert` is Python source or `null`. For `claim` it is required: self-contained (all imports included), no input,
  no network, no files, runs in well under a second, and its `assert` statements pass on Python 3.12 and newer
  exactly when the sentence is true. Test the claim itself, not a nearby fact. Otherwise `null`.

Only the JSON object. No Markdown fence around it.
