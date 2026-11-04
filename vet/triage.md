# Triage

Sentences the owner settles.

## conditions: text:0 <!-- fp:d969abc5d6db -->

> A comparison gives a `bool`: `==` equal, `!=` not equal, `<`, `<=`, `>`, `>=`.

- file: w1/a/conditions/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. Comparison operators return whatever the operands' rich-comparison methods return; Python does not force the result to be a bool. User classes and NumPy arrays can make `a == b` return a non-bool.
- claude: true, claim. Each of the six comparison operators gives a bool for ordinary values such as numbers.
- proposed assert:

```python
a, b = 3, 5
for r in (a == b, a != b, a < b, a <= b, a > b, a >= b):
    assert type(r) is bool
```

## conditions: text:3 <!-- fp:14c61d358b58 -->

> `if` runs its indented block only when its condition is `True`.

- file: w1/a/conditions/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. An `if` block runs whenever its condition is truthy, not only when it is the literal `True`; for example, `if 1:` executes its block.
- claude: true, simplification. The block runs when the condition is truthy, not only when it is exactly `True` (for example a non-empty string). That is fine for a beginner at this stage.
- proposed assert:

```python
ran = False
if 1:
    ran = True
assert not ran
```

## conditions: text:6 <!-- fp:78975a8c7c90 -->

> Each side must be a full comparison.

- file: w1/a/conditions/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude false)
- deepseek: false, claim. Python does not require each side of `and`/`or` to be a comparison; operands can be any expressions, such as `1 and 2`.
- claude: false, claim. Python does not require full comparisons: `True and 5` or `flag or other` are valid. A full comparison is needed only to express 'x is 1 or 2'. The sentence overstates this as a rule.
- proposed assert:

```python
try:
    eval('True and 5')
    ok = True
except Exception:
    ok = False
assert not ok
```

## conditions: task:conditions-weekend:hint:1 <!-- fp:9540e6dd7f46 -->

> Each side of `or` needs its own comparison of `day`: one for `"sat"`, one for `"sun"`.

- file: w1/a/conditions/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude advice)
- deepseek: true, claim. To test either value with `or`, both operands must compare `day`; a bare `"sun"` is a truthy string, so the condition would not be a proper equality check.
- claude: true, advice. This is a hint: write `day == "sat" or day == "sun"`.
- proposed assert:

```python
assert ("mon" == "sat" or "mon" == "sun") is False
assert ("mon" == "sat" or "sun") == "sun"
assert ("sat" == "sat" or "sat" == "sun") is True
assert ("sun" == "sat" or "sun" == "sun") is True
```

## conditions: task:conditions-ticket-price:hint:0 <!-- fp:402c5f2d5608 -->

> Keep going with `elif`: the order of the checks matters.

- file: w1/a/conditions/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude advice)
- deepseek: true, claim. An if/elif chain checks conditions from top to bottom, so changing the order can change which branch runs when conditions overlap.
- claude: true, advice. Order matters in an if/elif chain because the first matching branch wins.
- proposed assert:

```python
def f(x):
    if x < 10:
        return "first"
    elif x < 20:
        return "second"

def g(x):
    if x < 20:
        return "second"
    elif x < 10:
        return "first"

assert f(5) == "first"
assert g(5) == "second"
```

## conditions: remember:0 <!-- fp:8f8de9c845e1 -->

> == compares, = stores.

- file: w1/a/conditions/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. In Python, == is the equality comparison operator, while = is the assignment operator that binds the right-hand value to the left-hand name.
- claude: true, simplification. `==` compares and `=` assigns. It leaves out that `=` is a statement and that other operators like `:=` also store.
- proposed assert:

```python
x = 3
assert x == 3
assert (3 == 3) is True
assert (3 == 4) is False
```

## conditions: remember:0 <!-- fp:81a305fab019 -->

> if x = 3: is a syntax error.

- file: w1/a/conditions/lesson.md
- why it is here: verdicts differ or doubt it (deepseek true, claude unsure)
- deepseek: true, claim. An assignment using = is not allowed as an if condition; CPython raises SyntaxError. Assignment expressions use := instead.
- claude: unsure, not-a-fact. invalid reply: a claim needs Python source with an assert statement
- proposed assert:

```python
try:
    compile("if x = 3:\n    pass", "<test>", "exec")
except SyntaxError:
    assert True
else:
    assert False
```

## hello-village: text:0 <!-- fp:3cdd45525dd7 -->

> "`print()` shows text on the screen," she says.

- file: w1/a/hello-village/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude not-a-fact)
- deepseek: true, claim. print() writes its arguments to standard output, which is normally the screen; in the paragraph it is used with a quoted string.
- claude: true, not-a-fact. This is story dialogue. The claim in it, that `print()` shows text, is correct.
- proposed assert:

```python
import contextlib, io
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    print("hello")
assert buf.getvalue() == "hello\n"
```

## hello-village: text:0 <!-- fp:7ae6f8ffe185 -->

> "The text goes between the quotes."

- file: w1/a/hello-village/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude not-a-fact)
- deepseek: true, simplification. It is a beginner-friendly way to say that a string literal's characters sit inside the quote marks. It leaves out that print() can also display variables, numbers, and expression results, and that quotes delimit strings rather than being printed.
- claude: true, not-a-fact. This is story dialogue giving a beginner instruction. String literals do go between quotes.

## hello-village: remember:1 <!-- fp:da54a5945186 -->

> The text goes between the quotes.

- file: w1/a/hello-village/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude simplification)
- deepseek: true, not-a-fact. The sentence is an instruction about where text belongs in a template, not a statement about Python behavior.
- claude: true, simplification. A string literal is written between quotes. It leaves out that `print()` can take variables and other values without quotes.

## input-output: text:3 <!-- fp:3c927162ea6a -->

> `input()` waits for the user to type a line and gives it back.

- file: w1/a/input-output/lesson.md
- why it is here: the two families name different backing (deepseek doc:https://docs.python.org/3/library/functions.html#input, claude claim)
- deepseek: true, doc:https://docs.python.org/3/library/functions.html#input. The Python docs say input() reads a line from input and returns it as a string, with the trailing newline stripped. Waiting for that line is how interactive input works.
- claude: true, claim. `input()` reads one line from standard input and returns it, without the trailing newline.
- proposed assert:

```python
import io, sys
old = sys.stdin
sys.stdin = io.StringIO('hello\n')
try:
    r = input()
finally:
    sys.stdin = old
assert r == 'hello'
```

## input-output: text:3 <!-- fp:c60780d7d266 -->

> It **always** gives back a `str`, even when the user types digits.

- file: w1/a/input-output/lesson.md
- why it is here: deepseek's proposed assert failed: input() is waiting for an answer: type it in the input box, one line per input()
- deepseek: true, claim. In Python 3, input() returns a string; numeric-looking input is not converted automatically.
- claude: true, claim. input() returns the typed line as a str, digits included.
- proposed assert:

```python
import sys, io
sys.stdin = io.StringIO('123\n')
v = input()
assert type(v) is str and v == '123'
```

## input-output: text:5 <!-- fp:6e111eeafc2e -->

> Call `input()` with nothing inside the brackets: a question would be printed too, and the check would not match.

- file: w1/a/input-output/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. This is an instruction for the exercise. Its explanation is accurate: input(prompt) prints the prompt, which can make the program's output fail the check.
- claude: true, claim. A prompt passed to input() is written to standard output, so it would show up in the program's output and break an exact match.
- proposed assert:

```python
import sys, io, contextlib
sys.stdin = io.StringIO('x\n')
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    input('Name? ')
assert 'Name? ' in buf.getvalue()
```

## input-output: task:io-greet:hint:0 <!-- fp:c976b6eca4ac -->

> `name = input()` reads the line.

- file: w1/a/input-output/lesson.md
- why it is here: deepseek's proposed assert failed: input() is waiting for an answer: type it in the input box, one line per input()
- deepseek: true, claim. input() reads one line from standard input and returns it as a string, without the trailing newline.
- claude: true, claim. input() reads one line and name holds it.
- proposed assert:

```python
import sys, io
sys.stdin = io.StringIO('Sam\n')
name = input()
assert name == 'Sam'
```

## input-output: task:io-double:prompt <!-- fp:572f0298f720 -->

> For `4` it currently prints `Double: 44`; it should print `Double: 8`.

- file: w1/a/input-output/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. The sentence describes the exercise scenario and expected behavior, not a general Python fact.
- claude: true, claim. Without int(), the str '4' is repeated by * 2, which gives '44'.
- proposed assert:

```python
x = '4'
assert f'Double: {x * 2}' == 'Double: 44'
assert f'Double: {int(x) * 2}' == 'Double: 8'
```

## input-output: remember:1 <!-- fp:5549a0505075 -->

> input() always returns a str, even when the user types digits.

- file: w1/a/input-output/lesson.md
- why it is here: deepseek's proposed assert failed: AttributeError: module 'contextlib' has no attribute 'redirect_stdin'. Did you mean: 'redirect_stderr'?
- deepseek: true, claim. In Python 3, input() returns a str and does not convert digit input to a number.
- claude: true, claim. input() returns a str even when the text is digits.
- proposed assert:

```python
import sys, io
sys.stdin = io.StringIO('42\n')
v = input()
assert type(v) is str and v == '42'
```

## loops: task:loops-sum-to:hint:0 <!-- fp:dff1ce9f164f -->

> Keep a total and loop over `range(1, n + 1)`.

- file: w1/a/loops/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. This is an instruction for writing a loop, not a checkable statement about Python behavior.
- claude: true, advice. A hint on how to solve the exercise; it works.

## loops: text:8 <!-- fp:22b36ab68e89 -->

> `while` repeats as long as its condition is `True`.

- file: w1/a/loops/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. Python actually keeps looping while the condition is truthy, not only while it is the literal True, and it re-checks the condition each iteration. This is a reasonable beginner-level shorthand.
- claude: true, claim. A while loop repeats while its condition is true. It is simplified, since any truthy value works, not only True.
- proposed assert:

```python
n = 0
while n < 3:
    n += 1
assert n == 3
```

## values: text:0 <!-- fp:e21c61269ef1 -->

> Python works with **values**.

- file: w1/a/values/lesson.md
- why it is here: the two families name different backing (deepseek doc:https://docs.python.org/3/reference/datamodel.html#objects-values-and-types, claude simplification)
- deepseek: true, doc:https://docs.python.org/3/reference/datamodel.html#objects-values-and-types. The Python documentation describes all data in a program as objects, each with an identity, a type, and a value.
- claude: true, simplification. Everything in Python is an object, and values are the beginner's word for them.

## values: text:5 <!-- fp:ab4c87e26c7a -->

> Numbers do arithmetic: `*` multiplies, `/` divides and always gives a float, `//` divides and rounds down to a whole number, `%` gives the remainder, and `**` raises to a power.

- file: w1/a/values/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. For built-in complex numbers, `/` returns a complex, not a float, and `//` is not defined; the blanket 'always gives a float' is false as written.
- claude: true, claim. Each operator behaves as described. // rounds down (floors), also for negatives.
- proposed assert:

```python
assert 3 * 4 == 12
assert type(4 / 2) is float and 4 / 2 == 2.0
assert 7 // 2 == 3 and -7 // 2 == -4
assert 7 % 3 == 1
assert 2 ** 3 == 8
```

## values: text:8 <!-- fp:9432d91d0242 -->

> The starter body is `pass`, which means "nothing yet": replace it with your code.

- file: w1/a/values/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. It describes the exercise starter code and tells the learner what to do; `pass` is indeed a placeholder that does nothing.
- claude: true, claim. pass is a statement that does nothing, so a function with only pass returns None.
- proposed assert:

```python
def f():
    pass
assert f() is None
```

## values: text:10 <!-- fp:ef8fa0ceffe5 -->

> Types matter.

- file: w1/a/values/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. It is a broad framing statement, not a specific checkable fact. It is true that Python values have types that decide how operators like + behave.
- claude: true, advice. It is a general lead-in saying to pay attention to types.

## values: text:10 <!-- fp:8b9f894df9aa -->

> `+` adds numbers, but it **joins** strings.

- file: w1/a/values/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that `+` also concatenates other sequences such as lists and tuples, and that operands must be compatible (for example, `"3" + 4` raises TypeError).
- claude: true, claim. + adds numbers and concatenates strings.
- proposed assert:

```python
assert 3 + 4 == 7
assert '3' + '4' == '34'
```

## values: task:values-add-strings:hint:1 <!-- fp:8baa72abbc02 -->

> Use `int()` on each piece of text before adding them.

- file: w1/a/values/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. The sentence is an instruction telling the learner to convert text to integers before adding, not a factual claim about Python behavior. It is reasonable advice for adding numeric input values, though it assumes the text represents integers.
- claude: true, advice. It is a hint to convert with int() first.

## values: task:values-describe:hint:0 <!-- fp:0ef470ec62c1 -->

> `age` is an int: turn it into text before joining.

- file: w1/a/values/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude not-a-fact)
- deepseek: true, advice. Python string concatenation and str.join require strings, so an int must be converted with str() first.
- claude: true, not-a-fact. A hint for the exercise.

## values: remember:0 <!-- fp:2550426a34ed -->

> Every value has a type: int, float, str or bool.

- file: w1/a/values/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. Python values can have many other types, such as list, tuple, dict, NoneType, and user-defined classes. The four named types are examples, not an exhaustive list.
- claude: true, simplification. Fine for a first lesson, but it leaves out other types such as list, dict and None.
- proposed assert:

```python
assert isinstance([], (int, float, str, bool))
```

## comprehensions: text:0 <!-- fp:3d96ca0807e8 -->

> A **list comprehension** builds a list in one line: what to put in, then the loop, then an optional `if` to filter.

- file: w1/b/comprehensions/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that a comprehension may span multiple physical lines and may contain multiple for/if clauses; the basic expression-then-loop-then-optional-filter order is correct.
- claude: true, claim. A comprehension has an expression, then `for`, then an optional `if`.
- proposed assert:

```python
assert [x * 2 for x in range(5) if x % 2 == 1] == [2, 6]
```

## dicts: task:dicts-count-words:hint:0 <!-- fp:34c36491fe1d -->

> Loop over `text.split()` and count like the fruit example.

- file: w1/b/dicts/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. This is an instruction telling the learner what to do, not a claim about Python behavior.
- claude: true, advice. A hint for the exercise. text.split() splits on whitespace, which fits words separated by spaces.

## dicts: text:9 <!-- fp:d3c5f4d312b1 -->

> A **set** keeps each value only once and has no order.

- file: w1/b/dicts/lesson.md
- why it is here: the two families name different backing (deepseek doc:https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset, claude claim)
- deepseek: true, doc:https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset. The Python documentation defines a set as an unordered collection of distinct hashable objects, so duplicates are not kept and sets do not support sequence order or indexing.
- claude: true, claim. Sets drop duplicates and have no defined order (no indexing).
- proposed assert:

```python
s = {1, 2, 2, 3}
assert len(s) == 3
try:
    s[0]
    ok = False
except TypeError:
    ok = True
assert ok
```

## dicts: text:9 <!-- fp:45dfbc3066e4 -->

> Small whole numbers often print sorted by accident, as below, but never count on it.

- file: w1/b/dicts/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude claim)
- deepseek: true, advice. Set iteration order is not guaranteed, so relying on sorted-looking output from small integers is unsafe; the sorted appearance is just an implementation quirk.
- claude: true, claim. Small ints hash to themselves so sets of them often print in sorted order, but the order is not guaranteed.
- proposed assert:

```python
assert list({3, 1, 2}) == [1, 2, 3]
assert list({8, 1}) != [1, 8] or True
assert list({0, 8}) == [0, 8]
assert list({8, 0, 16}) != sorted({8, 0, 16})
```

## dicts: task:dicts-unique-sorted:hint:0 <!-- fp:f7b2646746eb -->

> A set has no order, but `sorted()` takes a set and returns a list.

- file: w1/b/dicts/lesson.md
- why it is here: verdicts differ or doubt it (deepseek unsure, claude true)
- deepseek: unsure, not-a-fact. invalid reply: a claim needs Python source with an assert statement
- claude: true, claim. sorted accepts a set and returns a list.
- proposed assert:

```python
r = sorted({3, 1, 2})
assert r == [1, 2, 3]
assert isinstance(r, list)
```

## dicts: task:dicts-in-both:prompt <!-- fp:5de955671d65 -->

> `x in b` checks a list too, and `x not in both` is its opposite.

- file: w1/b/dicts/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. The opposite of `x in b` is `x not in b`; `x not in both` is only the opposite of `x in both`, and `both` is not defined in the sentence.
- claude: true, claim. in works on lists, and not in is the opposite of in.
- proposed assert:

```python
b = [1, 2]
both = [1]
assert (1 in b) is True
assert (3 in b) is False
assert (2 not in both) is True
assert (1 not in both) is (not (1 in both))
```

## grids: text:2 <!-- fp:e3b55e0157ff -->

> Two loops, one inside the other, visit every cell: the outer loop takes a row, the inner loop walks along it.

- file: w1/b/grids/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. This describes the intended nested-loop pattern for visiting cells, not a specific Python behavior claim.
- claude: true, claim. Nested loops visit every cell: outer over rows, inner over each row's cells.
- proposed assert:

```python
grid = [[1, 2], [3, 4]]
seen = []
for row in grid:
    for cell in row:
        seen.append(cell)
assert seen == [1, 2, 3, 4]
```

## grids: task:grids-sum:hint:0 <!-- fp:ed6fce54bf9f -->

> Use a loop over the rows, and a loop over each row's cells.

- file: w1/b/grids/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. The sentence is an instruction about how to write code, not a factual claim about Python behavior.
- claude: true, advice. A hint for the exercise: nested loops over rows and cells.

## grids: task:grids-board:hint:1 <!-- fp:d3ec19311c96 -->

> Build the rows one by one: start with an empty list, and inside a loop over `rows` append a brand-new row list of `cols` dots.

- file: w1/b/grids/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. The sentence is an instruction telling the learner how to build the grid, not a factual claim about Python behavior.
- claude: true, advice. A hint for the exercise: append a fresh row list each loop iteration so rows are independent.

## grids: task:grids-column:hint:1 <!-- fp:98e74b9bfb72 -->

> For the first column, `row[0]` is that row's first value; use `c` instead of `0`.

- file: w1/b/grids/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude not-a-fact)
- deepseek: true, claim. For a sequence like a row list, index 0 is the first value; using a variable c that holds 0 accesses the same value.
- claude: true, not-a-fact. An instruction hint for the exercise.
- proposed assert:

```python
row = ["first", "second"]
c = 0
assert row[0] == "first"
assert row[c] == row[0]
```

## grids: remember:1 <!-- fp:b16a1dda3b60 -->

> A loop inside a loop visits every cell.

- file: w1/b/grids/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It is a teaching shorthand for nested loops over a grid. It leaves out that the outer loop must cover all rows and the inner loop all cells in each row, without breaks or wrong ranges.
- claude: true, claim. A nested for loop over rows and then cells visits every cell.
- proposed assert:

```python
grid = [[1, 2, 3], [4, 5, 6]]
seen = []
for row in grid:
    for v in row:
        seen.append(v)
assert seen == [1, 2, 3, 4, 5, 6]
```

## lists: text:9 <!-- fp:4673d6d0978f -->

> To get an independent list, copy it: `a.copy()` or `list(a)`.

- file: w1/b/lists/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. `a.copy()` and `list(a)` both make a new outer list, but they are shallow copies; nested mutable elements are still shared, which the sentence does not mention.
- claude: true, claim. Both copy() and list() make a new independent (shallow) list.
- proposed assert:

```python
a = [1, 2]
b = a.copy()
c = list(a)
b.append(3)
c.append(4)
assert a == [1, 2]
assert b is not a and c is not a
```

## strings: text:3 <!-- fp:aaf5ed3812ca -->

> `split()` cuts a string into a list of words (lists are the next lesson).

- file: w1/b/strings/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that split() with no argument separates on any whitespace and keeps punctuation attached; with an argument it splits on that separator.
- claude: true, claim. split() with no argument splits on whitespace and returns a list of words.
- proposed assert:

```python
assert 'noa river'.split() == ['noa', 'river']
```

## strings: text:7 <!-- fp:ceb41e308347 -->

> A method returns a new string and leaves the old one as it was, so keep the result in a variable.

- file: w1/b/strings/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. Not every string method returns a new string: for example, isdigit() returns a bool and split() returns a list. The immutability point only applies to methods that actually return a string.
- claude: true, claim. String methods return a new string and leave the original unchanged.
- proposed assert:

```python
s = 'Hello'
t = s.upper()
assert s == 'Hello'
assert t == 'HELLO'
```

## strings: remember:2 <!-- fp:5161ad5d42d5 -->

> split() turns a string into a list of words; strip() removes spaces and line breaks at both ends.

- file: w1/b/strings/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that split() splits on whitespace and keeps punctuation attached, and that strip() removes all leading/trailing whitespace, not only spaces and line breaks.
- claude: true, claim. split() with no argument returns a list of whitespace-separated words, and strip() removes whitespace (spaces and newlines) from both ends.
- proposed assert:

```python
assert 'a b  c'.split() == ['a', 'b', 'c']
assert '  hi\n'.strip() == 'hi'
```

## errors: text:0 <!-- fp:a9febbccc506 -->

> Read it from the bottom: the last line names the error and says what happened, and the lines above show where.

- file: w1/c/errors/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude advice)
- deepseek: true, claim. A standard Python traceback ends with the exception type and message, while the lines above give the file, line and function frames showing where it happened.
- claude: true, advice. It recommends how to read a traceback. The last line holds the error type and message, and the lines above show the call path.
- proposed assert:

```python
import traceback

def f():
    return 1 / 0

try:
    f()
except ZeroDivisionError:
    tb = traceback.format_exc()

lines = tb.strip().splitlines()
assert lines[-1] == 'ZeroDivisionError: division by zero'
assert any('in f' in line for line in lines[:-1])
assert any('line ' in line for line in lines[:-1])
```

## errors: text:0 <!-- fp:809b403f6b98 -->

> The usual suspects: `NameError` (a name that does not exist), `TypeError` (the wrong type, like `"3" + 4`), `ValueError` (the right type but a bad value, like `int("abc")`), `IndexError` and `KeyError`.

- file: w1/c/errors/lesson.md
- why it is here: verdicts differ or doubt it (deepseek true, claude unsure)
- deepseek: true, claim. Each listed exception is real, and the examples do raise the named exceptions: an undefined name gives NameError, `"3" + 4` gives TypeError, and `int("abc")` gives ValueError.
- claude: unsure, not-a-fact. invalid reply: a claim needs Python source with an assert statement
- proposed assert:

```python
def _raises(exc, f):
    try:
        f()
    except exc:
        return True
    except Exception:
        return False
    return False
assert _raises(NameError, lambda: undefined_name_for_review)
assert _raises(TypeError, lambda: "3" + 4)
assert _raises(ValueError, lambda: int("abc"))
assert _raises(IndexError, lambda: [][0])
assert _raises(KeyError, lambda: {}["missing"])
```

## errors: task:errors-safe-divide:hint:1 <!-- fp:7c1f869d72aa -->

> Put the division inside a `try`, and in the `except ZeroDivisionError` branch return `None`.

- file: w1/c/errors/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude not-a-fact)
- deepseek: true, advice. This is an instruction for how to structure the code, not a factual claim about Python behavior. It is a reasonable way to handle division by zero in the exercise.
- claude: true, not-a-fact. This is a hint on how to structure the solution.

## errors: text:8 <!-- fp:d010ea9dd6b8 -->

> `raise` signals a problem yourself, with a message for whoever reads the traceback.

- file: w1/c/errors/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It describes the typical use of raise. It leaves out that raise can be used without a message and can re-raise the current exception.
- claude: true, claim. raise throws an exception whose message appears in the traceback.
- proposed assert:

```python
try:
    raise ValueError("boom")
except ValueError as e:
    assert str(e) == "boom"
```

## errors: task:errors-withdraw:hint:0 <!-- fp:d8d4503b334d -->

> Check before subtracting.

- file: w1/c/errors/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude not-a-fact)
- deepseek: true, advice. It recommends checking operands before subtracting, which is valid advice and not a claim about Python behavior.
- claude: true, not-a-fact. Hint for the exercise.

## errors: remember:0 <!-- fp:27cb2772d0e1 -->

> Read a traceback from the bottom: the error's name and message, then the line it came from.

- file: w1/c/errors/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. This is an instruction for reading a traceback, not a claim about Python behavior. The last line usually gives the exception type and message, then the relevant frame line is above it.
- claude: true, advice. Advice on reading tracebacks. The last line holds the error name and message, and the line above it shows the code line.

## errors: remember:1 <!-- fp:5cef9452012a -->

> try / except SomeError handles that one kind of error; a bare except: hides your bugs too.

- file: w1/c/errors/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude claim)
- deepseek: true, advice. The factual part is correct: `except SomeError` catches that exception type (and subclasses), while a bare `except:` can catch unexpected errors and hide bugs. It also catches `BaseException` cases like `KeyboardInterrupt`, which the warning leaves unstated.
- claude: true, claim. except SomeError only catches that type, while a bare except catches every exception, including bugs like NameError.
- proposed assert:

```python
def f(exc):
    try:
        undefined_name
    except exc:
        return 'caught'
assert f(Exception) == 'caught'
try:
    f(ValueError)
    assert False
except NameError:
    pass
try:
    undefined_name
except:
    caught = True
assert caught
```

## functions: text:0 <!-- fp:cfdcf290b31a -->

> `print` only shows a value on screen, and a function without `return` gives back `None`.

- file: w1/c/functions/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that print writes to sys.stdout by default, can be redirected or use file=, and returns None; a function without return does give back None.
- claude: true, claim. print only displays a value, and a function with no return gives back None.
- proposed assert:

```python
def f():
    print('hi')
assert f() is None
```

## functions: text:3 <!-- fp:1db4c7cb080a -->

> Names created inside a function are **local**: they disappear when it returns.

- file: w1/c/functions/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. It is only the default: a name assigned after `global` or `nonlocal` is not local, and a closure can keep a local cell alive after the function returns. The sentence does not name these exceptions.
- claude: true, claim. Names assigned inside a function are local and not visible after it returns (closures aside, a beginner-level simplification).
- proposed assert:

```python
def f():
    inner = 1
    return inner
f()
try:
    inner
    assert False
except NameError:
    pass
```

## functions: task:functions-greeting:hint:0 <!-- fp:1e7cffb60bf2 -->

> Put the default in the `def` line.

- file: w1/c/functions/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude not-a-fact)
- deepseek: true, advice. This is an instruction about where to write a default value, not a claim about Python behavior.
- claude: true, not-a-fact. Hint for the exercise.

## functions: task:functions-log:prompt <!-- fp:bd15ed64e9cd -->

> Use `None` as the default, and make the list inside the function when `entries is None`.

- file: w1/c/functions/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude not-a-fact)
- deepseek: true, advice. It correctly recommends using None as the default and creating the list inside the function so each call without a list gets a fresh one.
- claude: true, not-a-fact. Instruction.

## recursion: text:0 <!-- fp:e625c33bf8b3 -->

> A **recursive** function calls itself on a smaller problem.

- file: w1/c/recursion/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. A function is recursive merely by calling itself; Python does not require the recursive call to use a smaller problem. The smaller-problem condition is needed for termination, but a recursive function can call itself on the same or larger input.
- claude: true, simplification. Good beginner definition. It leaves out that a recursive call is not always strictly smaller in a formal sense, and that recursion can be indirect.
- proposed assert:

```python
calls = []
def f(n):
    calls.append(n)
    if len(calls) < 2:
        return f(n)
    return n
result = f(5)
assert not (result == 5 and calls == [5, 5])
```

## recursion: text:2 <!-- fp:610d76da992d -->

> Each call waits for the smaller call to finish, then uses its answer.

- file: w1/c/recursion/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. In Python, a function call completes before the caller continues, so a recursive caller waits for the recursive call's return value before using it.
- claude: true, simplification. Describes how plain recursion works: each call is suspended until the inner call returns. It leaves out the call stack details.
- proposed assert:

```python
order = []

def f(n):
    order.append(("enter", n))
    if n == 0:
        return 0
    result = f(n - 1) + 1
    order.append(("after", n))
    return result

assert f(3) == 3
assert order == [("enter", 3), ("enter", 2), ("enter", 1), ("enter", 0), ("after", 1), ("after", 2), ("after", 3)]
```

## recursion: task:recursion-power:hint:1 <!-- fp:ae8acf1870b0 -->

> Add a base case first: when `exp` is 0, the answer is 1.

- file: w1/c/recursion/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. This is an instruction for writing the base case. It is correct for Python exponentiation, since x ** 0 returns 1, including 0 ** 0.
- claude: true, advice. Correct hint: any base to the power 0 is 1, and this is the natural base case.

## recursion: remember:0 <!-- fp:15baa40d7c64 -->

> A recursive function calls itself on a smaller input.

- file: w1/c/recursion/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, simplification. A recursive function need not call itself on a smaller input; it can call itself on the same or larger input as long as it makes progress toward a base case. The sentence states a common simplification as if it were always true.
- claude: true, simplification. Good beginner definition. It leaves out indirect recursion and the formal meaning of smaller.

## recursion: remember:1 <!-- fp:e611f88b22b0 -->

> Every recursion needs a base case that answers without calling itself.

- file: w1/c/recursion/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude simplification)
- deepseek: true, advice. This is a general rule of thumb about writing recursion: a terminating branch is needed so the recursion does not keep calling itself forever.
- claude: true, simplification. True for terminating recursion. It leaves out that a function could stop through an exception instead.

## class-attributes: task:class-attributes-lanterns:prompt <!-- fp:07355ba32a8d -->

> Change it through the class: `Lantern.made += 1`.

- file: w2/a/class-attributes/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. It is an instruction to increment the class attribute using the class name, which is the right way to keep a shared counter.
- claude: true, advice. It recommends changing the counter through the class.

## class-attributes: task:class-attributes-camp:hint:1 <!-- fp:072bba4d3f5c -->

> Create the empty `tents` list on `self` inside `__init__`.

- file: w2/a/class-attributes/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude not-a-fact)
- deepseek: true, advice. This is a correct recommendation: initializing a mutable list on self inside **init** avoids sharing one class-level list across instances.
- claude: true, not-a-fact. It is an instruction.

## class-attributes: remember:3 <!-- fp:84842b2d67ee -->

> Change a shared counter through the class: Ranger.count += 1.

- file: w2/a/class-attributes/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. It is an instruction to increment a class attribute, not a factual claim. It works when Ranger.count already exists as a class attribute.
- claude: true, advice. It recommends updating the shared counter through the class. self.count += 1 would create an instance attribute instead.

## classes: task:classes-tent:hint:0 <!-- fp:70fe108088fb -->

> Inside `__init__`, store each value on `self`.

- file: w2/a/classes/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude not-a-fact)
- deepseek: true, advice. This is a coding recommendation: instance values are often assigned to attributes on self inside **init**. It is not a claim about automatic Python behavior.
- claude: true, not-a-fact. It is a hint.

## classes: text:5 <!-- fp:8d5dc7584d0a -->

> Its first parameter is always `self`, the object you called it on, so the method can read and change that object's attributes.

- file: w2/a/classes/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. Python only conventionally names the first parameter `self`; any name may be used. Also, static and class methods do not receive the called instance as their first argument.
- claude: true, simplification. It is true for ordinary methods. It leaves out that the name self is only a convention, and that classmethods take cls and staticmethods take no automatic first argument.
- proposed assert:

```python
class A:
    def method(this):
        return this

a = A()
assert a.method() is a
assert A.method.__code__.co_varnames[0] == "self"
```

## classes: remember:0 <!-- fp:d476c188b5db -->

> A class is a blueprint; calling it, like Fox("Sly", 3), makes an object.

- file: w2/a/classes/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. The 'blueprint' image is a beginner-friendly simplification: a class is itself an object, and calling it runs **new**/**init** to create an instance. The concrete claim that calling Fox("Sly", 3) creates a Fox object is correct.
- claude: true, claim. Calling a class creates an instance of it.
- proposed assert:

```python
class Fox:
    def __init__(self, name, age):
        self.name = name
        self.age = age
f = Fox('Sly', 3)
assert isinstance(f, Fox)
assert type(f) is Fox
```

## classes: remember:3 <!-- fp:5a6d84b8e888 -->

> Every method's first parameter is self.

- file: w2/a/classes/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. Not every method receives self: static methods take no self and class methods receive cls first. Even for instance methods, self is only a naming convention.
- claude: true, simplification. True for ordinary instance methods. It leaves out staticmethod (no self) and classmethod (cls first), and the name self is only a convention.
- proposed assert:

```python
class C:
    @staticmethod
    def f(x):
        return x
assert C.f.__code__.co_varnames[0] == "self"
```

## identity: text:0 <!-- fp:62c940799d85 -->

> Two questions look alike but are not.

- file: w2/a/identity/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude not-a-fact)
- deepseek: true, claim. The sentence correctly says the two comparison questions are distinct: == tests equality while is tests object identity.
- claude: true, not-a-fact. A framing sentence introducing the contrast between == and is.
- proposed assert:

```python
x = [1]
y = [1]
assert x == y
assert x is not y
```

## identity: task:identity-trails:hint:0 <!-- fp:0f5728975cce -->

> Check `a is b` first, then compare names.

- file: w2/a/identity/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. It is an instruction about the order of checks, not a factual claim about Python behavior.
- claude: true, advice. A hint on the order of checks: identity first, because identical objects also have equal names.

## identity: task:identity-trails:hint:1 <!-- fp:d8a4a0082bbe -->

> Compare with `is` first, then the `name` attributes.

- file: w2/a/identity/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. It is an instruction about how to write the comparison, not a claim about Python behavior.
- claude: true, advice. A hint on how to structure the solution.

## identity: task:identity-copy-hiker:hint:0 <!-- fp:6ca3c04762d7 -->

> Make the new object with `Hiker(...)`, and copy the list with `list(...)` or `.copy()`.

- file: w2/a/identity/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. This is an instruction describing valid Python operations: calling Hiker(...) constructs an object, and list(...) or .copy() makes a shallow list copy.
- claude: true, claim. list(...) and .copy() both create a new list, and Hiker(...) creates a new object.
- proposed assert:

```python
p = ['a', 'b']
q = list(p)
r = p.copy()
assert q == p and q is not p
assert r == p and r is not p
```

## identity: task:identity-copy-hiker:hint:1 <!-- fp:958aba2a003f -->

> `list(...)` or `.copy()` makes an independent list.

- file: w2/a/identity/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. list(...) and .copy() make shallow copies: the new list is separate, but nested mutable elements are still shared. So they do not make a fully independent list in general.
- claude: true, claim. Both create a new list, so changes to the copy don't affect the original (shallow copy, which is fine for a list of strings).
- proposed assert:

```python
p = ['a']
q = list(p)
r = p.copy()
q.append('b')
r.append('c')
assert p == ['a']
```

## identity: task:identity-without-exact:hint:1 <!-- fp:f1be44a2d3cf -->

> Keep every bag where `x is not bag`, not `x != bag`.

- file: w2/a/identity/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. The sentence is an instruction to filter by object identity, not a general claim about how Python comparison operators behave.
- claude: true, advice. A hint: filtering with `is not` keeps by identity, whereas `!=` would drop equal but different bags.

## identity: remember:0 <!-- fp:ea76d1fbdd11 -->

> == asks: same value?

- file: w2/a/identity/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. == compares equality (usually by value via **eq**), while is compares object identity; custom classes can override ==, but the contrast is correct for ordinary values.
- claude: true, simplification. `==` calls `__eq__`, which usually compares values. It leaves out that `__eq__` can be defined to mean anything, and that default objects compare by identity.
- proposed assert:

```python
a = [3, 1]
b = [3, 1]
assert a == b
assert a is not b
assert a != [3, 2]
```

## identity: remember:1 <!-- fp:f4a3e6cca780 -->

> b = a gives a second name for the same object: change one, you change both.

- file: w2/a/identity/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. Assignment makes both names refer to the same object, but changing one name only changes the other when the object is mutated in place. Rebinding a name, or using an immutable object such as an int, leaves the other name unchanged.
- claude: true, simplification. It holds for mutable objects changed in place, such as lists. It leaves out that rebinding `a` does not change `b`, and that immutable objects cannot be changed.
- proposed assert:

```python
a = 1
b = a
a += 1
assert b == 2
```

## methods: text:0 <!-- fp:2cd6733225ee -->

> Some **answer** a question: they look at the object and return a value, changing nothing.

- file: w2/a/methods/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. Python has query-style methods that return a value without mutating the object, such as str.upper() and dict.get().
- claude: true, simplification. Describes query-style methods. It ignores methods that return a value but also have side effects.
- proposed assert:

```python
s = "abc"
t = s.upper()
assert t == "ABC"
assert s == "abc"
d = {1: 2}
v = d.get(1)
assert v == 2
assert d == {1: 2}
```

## methods: remember:0 <!-- fp:5144fa2f620c -->

> A method that answers returns a value and changes nothing.

- file: w2/a/methods/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. Returning a value does not imply that a Python method leaves the object unchanged; a method can both return a value and mutate state.
- claude: true, simplification. Describes the lesson's 'answering' method category. It leaves out methods that return a value and also change state.
- proposed assert:

```python
class Box:
    def __init__(self):
        self.x = 0
    def set_and_return(self):
        self.x = 1
        return 42
b = Box()
assert b.set_and_return() == 42
assert b.x == 0
```

## dataclasses: text:0 <!-- fp:afe630a854c6 -->

> Many classes only hold data: an `__init__` that stores each argument, a `__repr__` to show it, an `__eq__` to compare.

- file: w2/b/dataclasses/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude simplification)
- deepseek: true, not-a-fact. This is a general description of a common class pattern, not a specific Python behavior that code can verify; its wording is accurate.
- claude: true, simplification. Describes a common kind of data-holding class in a loose way. It does not claim all such classes need these three methods.

## dataclasses: text:11 <!-- fp:ec3d389eaa33 -->

> A list as a default would be shared by every object, the old trap from World 1.

- file: w2/b/dataclasses/lesson.md
- why it is here: the two families name different backing (deepseek doc:https://docs.python.org/3/library/dataclasses.html#mutable-default-values, claude claim)
- deepseek: true, doc:https://docs.python.org/3/library/dataclasses.html#mutable-default-values. A bare list default would be one shared object reused by instances that use the default, which is why dataclasses reject it and require default_factory for per-instance lists.
- claude: true, claim. A mutable default in a plain class is one object shared by all instances. A dataclass would refuse it, so the shared-list behaviour is shown with a class attribute.
- proposed assert:

```python
class A:
    items = []
a, b = A(), A()
a.items.append(1)
assert b.items == [1]
assert a.items is b.items
```

## dataclasses: text:11 <!-- fp:7a72d3d7f328 -->

> Ask for a new list each time with `field(default_factory=list)`.

- file: w2/b/dataclasses/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude claim)
- deepseek: true, advice. Using `field(default_factory=list)` gives each dataclass instance its own new list, avoiding a shared mutable default.
- claude: true, claim. default_factory=list builds a new list for every instance.
- proposed assert:

```python
from dataclasses import dataclass, field
@dataclass
class A:
    items: list = field(default_factory=list)
a, b = A(), A()
a.items.append(1)
assert b.items == []
assert a.items is not b.items
```

## dataclasses: text:14 <!-- fp:3a283d0e7fe4 -->

> The `__eq__` a dataclass writes has the same cost as your own: its objects cannot go in a set.

- file: w2/b/dataclasses/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. A frozen dataclass is hashable and can be put in a set, so the blanket claim that dataclass objects cannot go in a set is false. Default non-frozen dataclasses are indeed unhashable because **hash** is set to None.
- claude: true, claim. A dataclass with eq=True (default) and not frozen sets **hash** to None, as a hand-written **eq** without **hash** does, so instances are unhashable and cannot go in a set.
- proposed assert:

```python
from dataclasses import dataclass
@dataclass
class A:
    x: int
class B:
    def __eq__(self, o):
        return True
for obj in (A(1), B()):
    try:
        {obj}
        ok = True
    except TypeError:
        ok = False
    assert not ok
```

## dataclasses: remember:3 <!-- fp:7919a3aba726 -->

> @dataclass(order=True) sorts by the fields, in order.

- file: w2/b/dataclasses/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that order=True only generates comparison methods; sorted() or explicit comparisons then order instances by fields in declaration order. This is correct when the fields are comparable.
- claude: true, claim. order=True compares instances field by field in definition order.
- proposed assert:

```python
from dataclasses import dataclass
@dataclass(order=True)
class S:
    points: int
    name: str
assert sorted([S(2, 'b'), S(1, 'z'), S(2, 'a')]) == [S(1, 'z'), S(2, 'a'), S(2, 'b')]
```

## dunders: text:0 <!-- fp:fe116b23bf65 -->

> They are named with double underscores, "**dunder**" methods: `print(x)` calls `x.__str__()`, `len(x)` calls `x.__len__()`, and `a == b` calls `a.__eq__(b)`.

- file: w2/b/dunders/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. The equality claim is not universal: if b's type is a proper subclass of a's type and overrides **eq**, Python tries b.**eq**(a) first, falling back to a.**eq**(b) only if that returns NotImplemented.
- claude: true, claim. print uses **str**, len uses **len**, and == uses **eq** (simplified: print goes through str(), and == may try the reflected side too).
- proposed assert:

```python
import io, contextlib
class A:
    def __str__(self):
        return 'hi'
    def __len__(self):
        return 7
    def __eq__(self, other):
        return 'eq'
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    print(A())
assert buf.getvalue() == 'hi\n'
assert len(A()) == 7
assert (A() == 1) == 'eq'
```

## dunders: text:0 <!-- fp:259c51c508a4 -->

> Write them, and your objects work with Python's own tools.

- file: w2/b/dunders/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude simplification)
- deepseek: true, advice. Writing special methods lets Python's built-in operations use your objects, but only for the operations you actually implement.
- claude: true, simplification. Loosely says that defining dunder methods lets objects work with built-ins like print, len and ==. It leaves out that only the dunders you write give each behaviour.

## dunders: task:dunders-mushroom:hint:0 <!-- fp:344bdca0d5ae -->

> `__str__` returns an f-string; `__eq__(self, other)` compares both attributes.

- file: w2/b/dunders/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. This describes the intended implementation in the exercise, not a general Python rule; **str** can return any string and **eq** can compare whatever the class chooses.
- claude: true, advice. This is a hint on how to implement the two methods.

## dunders: task:dunders-mushroom:hint:1 <!-- fp:a2d3b9cd7527 -->

> For `__str__`, return an f-string with the name and the spots.

- file: w2/b/dunders/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. This is an instruction about what the exercise should implement, not a claim about Python behavior.
- claude: true, advice. This is a hint on how to implement **str**.

## dunders: text:7 <!-- fp:a2f252ee2da8 -->

> Writing `__eq__` has one cost: Python no longer lets those objects go in a set or be keys in a dict (`TypeError: unhashable type`).

- file: w2/b/dunders/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It describes the default: defining **eq** without defining **hash** sets **hash** to None, so instances raise TypeError in sets or as dict keys. It leaves out that a consistent **hash** can be defined to keep them hashable.
- claude: true, claim. A class that defines `__eq__` without `__hash__` gets `__hash__ = None`, so its instances cannot go in sets or be dict keys. Defining `__hash__` too would lift the limit, but that is outside the sentence.
- proposed assert:

```python
class A:
    def __eq__(self, other):
        return True
for f in (lambda: {A()}, lambda: {A(): 1}):
    try:
        f()
    except TypeError as e:
        assert 'unhashable' in str(e)
    else:
        assert False
```

## dunders: text:7 <!-- fp:50c6681cc57a -->

> Sets and dicts find items by a number worked out from each object, and the old one, based on identity, would disagree with your new `==`.

- file: w2/b/dunders/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. Hash-based containers use hash values, so an identity-based hash would conflict with a value-based **eq** that treats distinct objects as equal. The wording simplifies lookup: sets and dicts also compare equality, and Python actually sets **hash** to None instead of keeping the identity hash.
- claude: true, simplification. Hashes must agree with equality, so the identity-based default hash would break lookups once `==` changes. It leaves out that you can define `__hash__` yourself.
- proposed assert:

```python
class A:
    def __init__(self, x):
        self.x = x
    def __eq__(self, other):
        return isinstance(other, A) and self.x == other.x
    def __hash__(self):
        return id(self)

a, b = A(1), A(1)
assert a == b
assert hash(a) != hash(b)
assert len({a, b}) == 2
assert len({a: 1, b: 2}) == 2
```

## dunders: text:9 <!-- fp:9b2a3aa834d3 -->

> With `__len__`, `len(obj)` works, and an `if` treats an object of length 0 as false.

- file: w2/b/dunders/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that a **bool** method, if defined, overrides **len** for truth testing. In the usual case where only **len** is defined, length 0 is false.
- claude: true, claim. Without `__bool__`, truthiness falls back to `__len__`, so length 0 is false.
- proposed assert:

```python
class Q:
    def __init__(self, n):
        self.n = n
    def __len__(self):
        return self.n
assert len(Q(2)) == 2
assert not Q(0)
assert Q(1)
```

## dunders: text:12 <!-- fp:7c543d13e28e -->

> These methods **return** their answer.

- file: w2/b/dunders/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude advice)
- deepseek: true, claim. For special methods such as **str**, Python uses the returned value; **str** must return a string, and returning None raises a TypeError.
- claude: true, advice. A rule for these special methods: they must return a value. It is a general statement about the methods in this lesson, not about every dunder.
- proposed assert:

```python
class Greeter:
    def __str__(self):
        return "hello"

assert str(Greeter()) == "hello"

class Bad:
    def __str__(self):
        return None

try:
    str(Bad())
except TypeError:
    pass
else:
    raise AssertionError
```

## dunders: task:dunders-badge:hint:1 <!-- fp:7a9b49d46a36 -->

> `__str__` must return the text, not print it.

- file: w2/b/dunders/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude advice)
- deepseek: true, claim. **str** has to return a string; a print-only implementation returns None, so str(obj) raises TypeError. Printing may happen as a side effect, but it cannot replace returning the text.
- claude: true, advice. A rule for writing `__str__`: it must return its text. Printing inside it breaks `print` and `str()`.
- proposed assert:

```python
class Badge:
    def __init__(self, owner):
        self.owner = owner
    def __str__(self):
        return f"Badge of {self.owner}"

assert str(Badge("Ada")) == "Badge of Ada"

class PrintOnlyBadge:
    def __str__(self):
        print("Badge of Ada")

try:
    str(PrintOnlyBadge())
except TypeError:
    pass
else:
    assert False, "__str__ must return a string"
```

## dunders: task:dunders-sign:prompt <!-- fp:72234f82f4bb -->

> A dunder method returns its answer.

- file: w2/b/dunders/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. The sentence overgeneralizes: many dunder methods are hooks that return None, such as **init**, so not every dunder method returns an answer. In this paragraph the relevant rule is only that **str** must return a string.
- claude: true, simplification. True for `__str__`, `__repr__`, `__eq__` and `__len__`, the methods in this lesson. It leaves out that some dunders, such as `__init__`, must return None.
- proposed assert:

```python
class C:
    def __init__(self):
        self.answer = 42

assert C().__init__() == 42
```

## dunders: remember:3 <!-- fp:713455f7bf55 -->

> Dunder methods return their answer: a **str** that prints breaks print.

- file: w2/b/dunders/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. A **str** method must return a string; if it prints and returns None, print() raises TypeError instead of producing the object's text. The broader wording is beginner shorthand: protocol dunders supply return values, though some like **init** return None.
- claude: true, simplification. Fine for `__str__` and the other methods in this lesson. It leaves out dunders like `__init__` that must return None.
- proposed assert:

```python
class BadStr:
    def __str__(self):
        print("printed from __str__")

try:
    print(BadStr())
except TypeError as exc:
    assert "__str__ returned non-string" in str(exc)
else:
    raise AssertionError("print did not break")
```

## properties: text:0 <!-- fp:bbc37823cc2a -->

> Anyone can change an object's attributes from outside.

- file: w2/b/properties/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. Not every attribute can be changed from outside: a property without a setter raises AttributeError, and frozen dataclasses or custom **setattr** can block assignment. The sentence overgeneralizes from ordinary attributes.
- claude: true, claim. By default any code can assign to an object's attributes. Python has no enforced privacy.
- proposed assert:

```python
class C:
    pass
c = C()
c.x = 1
assert c.x == 1
c.x = 2
assert c.x == 2
```

## properties: task:properties-plot:hint:0 <!-- fp:9e617d366111 -->

> Each property is a method with the property decorator above it, returning a value.

- file: w2/b/properties/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. A property object is a descriptor, not a method; @property replaces the getter function with a property. The sentence also ignores properties created with property().
- claude: true, not-a-fact. A hint on how to write the exercise.
- proposed assert:

```python
class C:
    @property
    def value(self):
        return 1

assert callable(C.value)
```

## properties: task:properties-ranger-age:hint:1 <!-- fp:2eef6b66d3eb -->

> The getter reads `self._age`.

- file: w2/b/properties/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude not-a-fact)
- deepseek: true, claim. A property getter that returns self._age reads the underlying attribute, so changing _age changes the value exposed by the property.
- claude: true, not-a-fact. A hint describing the exercise code.
- proposed assert:

```python
class Person:
    def __init__(self):
        self._age = 0

    @property
    def age(self):
        return self._age

p = Person()
p._age = 7
assert p.age == 7
```

## properties: remember:2 <!-- fp:c64dffca7905 -->

> Store the real value under another name, like self._age, or the setter calls itself forever.

- file: w2/b/properties/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. The setter would indeed recurse if it assigns to the same property; the simplification is saying "forever" instead of noting that CPython stops with RecursionError at its recursion limit.
- claude: true, claim. Assigning to the property inside its own setter recurses until RecursionError, so 'forever' means until Python stops it.
- proposed assert:

```python
class P:
    @property
    def age(self):
        return self._age
    @age.setter
    def age(self, v):
        self.age = v
p = P()
try:
    p.age = 1
    assert False
except RecursionError:
    pass
```

## sortable: text:0 <!-- fp:b5f2f8a65bdf -->

> `sorted`, `max` (the biggest item) and `min` (the smallest) all work by comparing items: `sorted` and `min` ask `<`, `max` asks `>`.

- file: w2/b/sortable/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. In CPython 3.12, max() compares current maximum < candidate, so it uses `<` with reversed operands, not `>`. A class that defines only **lt** works with max() through that comparison.
- claude: true, claim. In CPython sorted and min use <, max uses >.
- proposed assert:

```python
calls = []
class A:
    def __init__(s, v):
        s.v = v
    def __lt__(s, o):
        calls.append('lt')
        return s.v < o.v
    def __gt__(s, o):
        calls.append('gt')
        return s.v > o.v
xs = [A(1), A(2), A(3)]
sorted(xs)
assert set(calls) == {'lt'}
calls.clear()
min(xs)
assert set(calls) == {'lt'}
calls.clear()
max(xs)
assert set(calls) == {'gt'}
```

## sortable: text:0 <!-- fp:3cef00ce2878 -->

> Numbers and strings know how.

- file: w2/b/sortable/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out complex numbers, which do not support < or >, but for ordinary ints/floats and strings the statement holds.
- claude: true, claim. Numbers and strings support ordering comparisons.
- proposed assert:

```python
assert 1 < 2
assert 'a' < 'b'
assert sorted([3, 1, 2]) == [1, 2, 3]
assert sorted(['b', 'a']) == ['a', 'b']
assert max([1, 3, 2]) == 3 and min('bca') == 'a'
```

## sortable: text:5 <!-- fp:f4379b4969e7 -->

> `reverse=True` turns any sort around.

- file: w2/b/sortable/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. For Python's built-in sorted() and list.sort(), reverse=True sorts in descending key order; equal keys keep their original relative order, as the paragraph adds.
- claude: true, simplification. reverse=True gives descending order; strictly equal items are not reversed, as the next sentence says.
- proposed assert:

```python
x = [(1, 'a'), (1, 'b'), (2, 'c')]
x.sort(key=lambda p: p[0], reverse=True)
assert x == [(2, 'c'), (1, 'a'), (1, 'b')]
assert sorted([3, 1, 2], reverse=True) == [3, 2, 1]
```

## sortable: task:sortable-oldest:prompt <!-- fp:7861ffd792f7 -->

> It crashes with a `TypeError`: give `sorted` a key function that returns `tree.age`, and keep `reverse=True`.

- file: w2/b/sortable/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude not-a-fact)
- deepseek: true, claim. Sorting Tree objects without an ordering key raises TypeError when sorted compares them. Using key=lambda tree: tree.age with reverse=True sorts by age descending, so the oldest tree comes first.
- claude: true, not-a-fact. Describes the exercise and gives instructions.
- proposed assert:

```python
class Tree:
    def __init__(self, kind, age):
        self.kind = kind
        self.age = age

trees = [Tree('oak', 10), Tree('pine', 5)]
try:
    sorted(trees, reverse=True)
except TypeError:
    pass
else:
    raise AssertionError('expected TypeError')

assert [t.kind for t in sorted(trees, key=lambda tree: tree.age, reverse=True)] == ['oak', 'pine']
```

## sortable: task:sortable-acorns:hint:0 <!-- fp:dedd591e846a -->

> `__lt__(self, other)` returns `True` when `self` is lighter than `other`.

- file: w2/b/sortable/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. Python does not define what "lighter" means for `__lt__`; the method returns whatever the class implementation returns. The statement is only true for classes whose `__lt__` is explicitly written to compare weight that way.
- claude: true, not-a-fact. Describes what the exercise's method should do.
- proposed assert:

```python
class Weight:
    def __init__(self, kg):
        self.kg = kg
    def __lt__(self, other):
        return False

a = Weight(1)
b = Weight(2)
assert a.__lt__(b) is True
```

## sortable: task:sortable-acorns:hint:1 <!-- fp:ee9efdf7e192 -->

> Compare the two objects' `weight` attributes with `<`, so `True` means `self` is lighter.

- file: w2/b/sortable/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude not-a-fact)
- deepseek: true, claim. The `<` comparison on weights returns True exactly when self's weight is smaller, i.e. when self is lighter.
- claude: true, not-a-fact. An instruction for the exercise.
- proposed assert:

```python
class Obj:
    def __init__(self, weight):
        self.weight = weight
    def __lt__(self, other):
        return self.weight < other.weight

a = Obj(1)
b = Obj(2)
assert (a < b) is True
assert (b < a) is False
```

## sortable: remember:0 <!-- fp:79ffa7e12aa5 -->

> sorted, max and min need to compare: give them a key, or a **lt**.

- file: w2/b/sortable/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. For multiple items, sorted, max, and min order by comparison; unorderable objects raise TypeError, while a key or an **lt** method supplies the needed ordering. It is a slight simplification: no comparison occurs for empty or single-item inputs, and keys must themselves be comparable.
- claude: true, simplification. A summary; leaves out other comparison dunders like **gt** or functools.total_ordering.
- proposed assert:

```python
class NoOrder:
    def __init__(self, v):
        self.v = v

for func in (sorted, max, min):
    try:
        func([NoOrder(1), NoOrder(2)])
    except TypeError:
        pass
    else:
        assert False

class Less:
    def __init__(self, v):
        self.v = v
    def __lt__(self, other):
        return self.v < other.v

assert [x.v for x in sorted([Less(2), Less(1)])] == [1, 2]
assert max([Less(1), Less(2)]).v == 2
assert min([Less(1), Less(2)]).v == 1
assert [x.v for x in sorted([NoOrder(2), NoOrder(1)], key=lambda x: x.v)] == [1, 2]
assert max([NoOrder(1), NoOrder(2)], key=lambda x: x.v).v == 2
assert min([NoOrder(1), NoOrder(2)], key=lambda x: x.v).v == 1
```

## composition: text:0 <!-- fp:31cd4817d803 -->

> Inheritance answers "is a": an owl **is an** animal.

- file: w2/c/composition/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude simplification)
- deepseek: true, advice. This is a design mnemonic for when inheritance is appropriate, not a claim about Python runtime behavior. It is a reasonable beginner-level rule of thumb.
- claude: true, simplification. Inheritance models an 'is a' relationship; this is a design guideline and leaves out subtleties.

## composition: text:0 <!-- fp:e6d29291613a -->

> Then the object keeps its parts as attributes and hands work to them.

- file: w2/c/composition/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude simplification)
- deepseek: true, advice. It describes the composition/delegation design idea, not a checkable behavior of Python itself. The advice is sound: objects can store collaborating objects as attributes and delegate work to them.
- claude: true, simplification. Describes composition in plain words. It leaves out that a part may also be passed in or shared, not only created inside the object.

## composition: text:6 <!-- fp:cd69863eeef6 -->

> Inheriting just to reuse some methods is tempting, and it makes odd claims: if `Ranger` inherits from `Backpack`, a ranger **is** a backpack, and every backpack method becomes a ranger method.

- file: w2/c/composition/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude claim)
- deepseek: true, advice. It is a design guideline: subclassing implies an is-a relationship and inherits the parent's methods, so inheriting only to reuse code is discouraged. The 'is a backpack' wording is conceptual, not a precise runtime claim.
- claude: true, claim. A subclass is an instance of its parent and inherits all its methods, so a Ranger that inherits Backpack is a backpack.
- proposed assert:

```python
class Backpack:
    def add(self, x):
        return x
class Ranger(Backpack):
    pass
r = Ranger()
assert isinstance(r, Backpack)
assert r.add(1) == 1
```

## composition: task:composition-ranger-pack:prompt <!-- fp:cd91c1ca7e22 -->

> A `Ranger` should **have** a `Backpack` called `pack`, so `ranger.pack.add("rope")` works.

- file: w2/c/composition/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude not-a-fact)
- deepseek: true, advice. This recommends a class design: a Ranger should contain a Backpack attribute rather than inherit from Backpack. It is a style/design rule, not a Python behavior claim.
- claude: true, not-a-fact. It describes what the exercise wants.

## composition: task:composition-cook-pantry:prompt <!-- fp:4ae677f74ebc -->

> A `Cook` should **have** a `Pantry` called `pantry`, so `cook.pantry.store("flour")` works, but right now a cook **is** a pantry: fix the design by giving the cook a `Pantry()` in `__init__` instead of inheriting.

- file: w2/c/composition/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude not-a-fact)
- deepseek: true, advice. This is a design recommendation: compose a Cook with a Pantry instead of making Cook inherit from Pantry. It is not a checkable statement about Python's behavior.
- claude: true, not-a-fact. It describes the exercise and tells the learner what to do.

## composition: remember:1 <!-- fp:fe011f01ddbc -->

> Composition says 'has a': a keeper has animals, kept as attributes.

- file: w2/c/composition/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude simplification)
- deepseek: true, advice. It is a design-terminology guideline rather than a Python runtime fact; keeping related objects as attributes is a common way to express composition.
- claude: true, simplification. It is a rule of thumb for composition. It leaves out that a has-a part need not be a collection or an attribute holding objects.

## composition: remember:2 <!-- fp:6ee743ea40cc -->

> The outer object hands work to its parts: self.engine.start().

- file: w2/c/composition/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude simplification)
- deepseek: true, not-a-fact. It is a conceptual explanation of delegation, not a precise claim about Python behavior. The call is valid when self.engine has a start method.
- claude: true, simplification. It describes delegation to parts in simple terms.

## inheritance: text:2 <!-- fp:54f594e74f37 -->

> Python looks for a method in the object's class first, then in its parent, then the parent's parent.

- file: w2/c/inheritance/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It is accurate for ordinary single-inheritance method lookup; it leaves out multiple inheritance (C3 MRO) and instance attributes that can shadow a method.
- claude: true, claim. Method lookup follows the MRO, which for single inheritance is class, parent, grandparent.
- proposed assert:

```python
class A:
    def f(self):
        return 'a'
class B(A):
    pass
class C(B):
    pass
assert C.__mro__[:3] == (C, B, A)
assert C().f() == 'a'
class B2(A):
    def f(self):
        return 'b'
class C2(B2):
    pass
assert C2().f() == 'b'
```

## inheritance: text:5 <!-- fp:2007bbfa77de -->

> `super()` reaches the parent's version, so the child can add to it instead of starting over.

- file: w2/c/inheritance/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that super() follows the method resolution order, so in multiple inheritance it may reach a sibling class rather than the immediate parent. In ordinary single-inheritance cases, the child can call the parent method and add to it.
- claude: true, claim. super() gives access to the parent's method so the child can extend it; checked on Python 3.13. With multiple inheritance it follows the method resolution order, a detail beginners can skip.
- proposed assert:

```python
class Parent:
    def greet(self):
        return "hello"
class Child(Parent):
    def greet(self):
        return super().greet() + " world"
assert Child().greet() == "hello world"
```

## inheritance: task:inheritance-fruit-tree:hint:0 <!-- fp:d6b2d44a7d3e -->

> In `__init__`, call the parent's initializer with `super()` before storing `fruit`.

- file: w2/c/inheritance/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. The sentence is an instruction for how to write the exercise's **init** method, not a factual claim about Python behavior.
- claude: true, advice. It is a hint on how to write **init**.

## inheritance: text:9 <!-- fp:df34f2e147f1 -->

> Without `super().__init__(...)`, the parent's attributes are never set, and using them raises `AttributeError`.

- file: w2/c/inheritance/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. It is false that the parent's **init** cannot run without super(): you can call Parent.**init**(self) directly, which sets the attributes and avoids AttributeError. Inherited class attributes also remain available without calling super().**init**().
- claude: true, claim. If the parent's **init** sets the attributes and the child never calls it, using them raises AttributeError.
- proposed assert:

```python
class P:
    def __init__(self):
        self.a = 1
class C(P):
    def __init__(self):
        pass
try:
    C().a
    raised = False
except AttributeError:
    raised = True
assert raised
```

## inheritance: task:inheritance-bat:prompt <!-- fp:734145287d6e -->

> The child's `__init__` must call `super().__init__(name)`.

- file: w2/c/inheritance/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. It is an instruction for fixing the exercise, not a general rule about Python. In this exercise, calling super().**init**(name) is the intended way to let Animal set name.
- claude: true, advice. It is the fix the exercise expects. Calling Animal.**init**(self, name) would also work, but super() is the recommended way.

## inheritance: remember:0 <!-- fp:7abda6f6888b -->

> class Owl(Animal) makes Owl a kind of Animal: it gets all of Animal's methods.

- file: w2/c/inheritance/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. Subclassing does inherit base-class methods through the MRO, but the statement leaves out that Owl can override methods and that lookup follows the MRO.
- claude: true, claim. A subclass inherits the parent's methods.
- proposed assert:

```python
class Animal:
    def eat(self):
        return 'eats'
class Owl(Animal):
    pass
assert Owl().eat() == 'eats'
assert issubclass(Owl, Animal)
```

## inheritance: remember:3 <!-- fp:bfb857ce5a3a -->

> A child's **init** must call super().**init**(...), or the parent's attributes are never set.

- file: w2/c/inheritance/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. A child that defines **init** can call Parent.**init** explicitly or set the attributes another way; only an automatic parent **init** call is omitted. Also, if the child does not override **init**, the parent's **init** runs normally.
- claude: true, simplification. It leaves out that this only matters when the parent's **init** sets attributes, and that Parent.**init**(self, ...) also works.
- proposed assert:

```python
class Parent:
    def __init__(self):
        self.x = 1

class Child(Parent):
    def __init__(self):
        Parent.__init__(self)

c = Child()
assert not hasattr(c, 'x')

```

## testing: text:0 <!-- fp:83ec8aeeb720 -->

> The tool is `assert`: it does nothing when its condition is true, and stops with an `AssertionError` when it is false.

- file: w2/c/testing/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. Under `python -O` (or `PYTHONOPTIMIZE`), assert statements are stripped, so a false condition does not raise `AssertionError`. The sentence describes only the default unoptimized mode without saying so.
- claude: true, claim. assert does nothing for a true condition and raises AssertionError for a false one (unless Python runs with -O).
- proposed assert:

```python
assert True
try:
    assert False
    raised = False
except AssertionError:
    raised = True
assert raised
```

## testing: task:testing-shout-test:prompt <!-- fp:990357b388ce -->

> `test_shout()` passes even when `shout` is broken.

- file: w2/c/testing/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude not-a-fact)
- deepseek: true, claim. A parenthesized assert evaluates a non-empty tuple, which is always truthy, so the faulty test passes even though both comparisons are false.
- claude: true, not-a-fact. It describes the exercise's setup, which is a test that cannot fail.
- proposed assert:

```python
def shout(text):
    return "wrong"

def test_shout():
    assert (shout("a") == "A", shout("b") == "B")

test_shout()
```

## testing: remember:3 <!-- fp:514c438f8230 -->

> Never put brackets around assert's two parts: a tuple is always true.

- file: w2/c/testing/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude advice)
- deepseek: true, claim. Parentheses around assert's condition and message create a two-element tuple, which is truthy, so the assertion passes without checking the condition.
- claude: true, advice. It is a style rule, and the reason given is correct: the bracketed pair is a non-empty tuple.
- proposed assert:

```python
try:
    assert (False, "message")
except AssertionError:
    raise AssertionError("parenthesized assert raised")
assert bool((False, "message")) is True
```

## files-json: text:0 <!-- fp:4321bf685e64 -->

> Data that should outlive your program goes in a **file**.

- file: w3/a/files-json/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude simplification)
- deepseek: true, advice. A general recommendation about persisting data outside the process's lifetime, not a checkable statement about Python behavior. It holds for file storage.
- claude: true, simplification. Files are the basic way to keep data after the program ends. It leaves out databases and other storage.

## files-json: text:0 <!-- fp:e508adde64b5 -->

> `open(path, "w")` opens one for writing, and `with` closes it for you when the block ends, so nothing is lost even if an error happens halfway.

- file: w3/a/files-json/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. `with` does close the file on an exception, but `open(path, "w")` truncates existing contents immediately, and an error halfway can leave only partial data; closing does not make writes transactional or durable.
- claude: true, claim. Leaving a `with` block, even through an error, closes the file and so flushes what was written. A StringIO shows the same closing behaviour.
- proposed assert:

```python
import io
s = io.StringIO()
try:
    with s:
        s.write('x')
        raise ValueError
except ValueError:
    pass
assert s.closed
```

## files-json: text:3 <!-- fp:f47c5ffc5ee6 -->

> Reading a file line by line gives each line with its `"\n"`, which `strip()` removes.

- file: w3/a/files-json/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. A final line without a trailing newline is yielded without `\n`, so not every line includes one. Also, `strip()` removes all leading and trailing whitespace, not just the newline.
- claude: true, claim. Iterating over a file yields each line with its trailing newline, and `strip()` removes it. The last line has no newline if the file does not end with one.
- proposed assert:

```python
import io
lines = list(io.StringIO('a\nb\n'))
assert lines == ['a\n', 'b\n']
assert [l.strip() for l in lines] == ['a', 'b']
```

## files-json: task:files-json-save:hint:0 <!-- fp:0c09a38ae895 -->

> Open the file with `"w"` inside a `with`, then loop over `lines`.

- file: w3/a/files-json/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, not-a-fact. Opening a file with "w" truncates it and makes it write-only, so iterating over its lines raises io.UnsupportedOperation: not readable. The instruction cannot work as written.
- claude: true, not-a-fact. It is a hint for the exercise.

## files-json: text:11 <!-- fp:c93fee5912f1 -->

> `"w"` starts a fresh file every time, even when one is there; `"a"` (append) keeps it and writes at the end.

- file: w3/a/files-json/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude doc:https://docs.python.org/3/library/functions.html#open)
- deepseek: true, claim. In text mode, "w" truncates an existing file or creates a new one, while "a" preserves existing content and writes at the end.
- claude: true, doc:https://docs.python.org/3/library/functions.html#open. "w" truncates an existing file, and "a" appends to the end of it.
- proposed assert:

```python
import os, tempfile
with tempfile.TemporaryDirectory() as d:
    p = os.path.join(d, "f.txt")
    with open(p, "w") as f:
        f.write("old")
    with open(p, "w") as f:
        f.write("new")
    with open(p, "r") as f:
        assert f.read() == "new"
    with open(p, "a") as f:
        f.write("!")
    with open(p, "r") as f:
        assert f.read() == "new!"
```

## files-json: task:files-json-logbook:hint:1 <!-- fp:86f4bd2b1688 -->

> Open it with `"a"` to add to the end.

- file: w3/a/files-json/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. It is an instruction to use append mode; Python's 'a' mode appends writes to the end of the file.
- claude: true, advice. It is a hint, and "a" is the right mode for adding to the end of a file.

## files-json: remember:1 <!-- fp:4a2e2bdd6b91 -->

> "r" reads (the default), "w" writes a fresh file, "a" adds to the end of it.

- file: w3/a/files-json/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that "w" truncates an existing file first and that "a" creates the file if it does not exist. These details do not change the basic beginner-level meaning.
- claude: true, claim. The default mode is 'r'. 'w' starts a fresh file and 'a' appends.
- proposed assert:

```python
import os, tempfile
d = tempfile.mkdtemp()
p = os.path.join(d, 'a.txt')
with open(p, 'w') as f:
    f.write('1')
with open(p, 'a') as f:
    f.write('2')
with open(p) as f:
    assert f.mode == 'r'
    assert f.read() == '12'
with open(p, 'w') as f:
    f.write('3')
with open(p) as f:
    assert f.read() == '3'
```

## files-json: remember:3 <!-- fp:299dffa91c42 -->

> Opening with "w" empties the file first: use "a" to keep what is already there.

- file: w3/a/files-json/lesson.md
- why it is here: the two families name different backing (deepseek doc:https://docs.python.org/3/library/functions.html#open, claude claim)
- deepseek: true, doc:https://docs.python.org/3/library/functions.html#open. The open() docs say mode 'w' truncates the file first, while mode 'a' opens for appending so existing contents are kept.
- claude: true, claim. Mode 'w' truncates the file on open, and 'a' keeps the existing content.
- proposed assert:

```python
import os, tempfile
p = os.path.join(tempfile.mkdtemp(), 'a.txt')
with open(p, 'w') as f:
    f.write('old')
with open(p, 'a') as f:
    f.write('new')
with open(p) as f:
    assert f.read() == 'oldnew'
with open(p, 'w') as f:
    pass
with open(p) as f:
    assert f.read() == ''
```

## functions-as-values: task:functions-as-values-twice:hint:0 <!-- fp:48c1004fa813 -->

> First `once = f(x)`, then call `f` on `once`.

- file: w3/a/functions-as-values/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. This is an instruction describing the order of two actions, not a claim about Python behavior.
- claude: true, advice. A hint on how to solve the exercise.

## functions-as-values: task:functions-as-values-twice:hint:1 <!-- fp:50027f9300f7 -->

> Return the second result: `double(double(3))` calls `double` twice.

- file: w3/a/functions-as-values/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. It is an exercise instruction; the factual aside that nested calls evaluate double twice is correct.
- claude: true, claim. double(double(3)) calls double twice, inner first, and the outer result is the second result.
- proposed assert:

```python
calls = []
def double(n):
    calls.append(n)
    return n * 2
r = double(double(3))
assert calls == [3, 6]
assert r == 12
```

## functions-as-values: text:8 <!-- fp:f46187863996 -->

> `map` applies the function to every item; `filter` keeps the items for which it gives `True`.

- file: w3/a/functions-as-values/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. filter keeps an item whenever the function returns any truthy value, not only the literal True. For example, a function returning "yes" still keeps the item.
- claude: true, simplification. filter keeps items for which the function returns a truthy value, not strictly True.
- proposed assert:

```python
assert list(map(lambda x: x * 2, [1, 2])) == [2, 4]
assert list(filter(lambda x: "yes", [0])) == []
```

## functions-as-values: text:12 <!-- fp:281354133fc1 -->

> With brackets you call it on the spot and pass whatever it returns, which is usually not a function at all.

- file: w3/a/functions-as-values/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. Adding brackets calls the function immediately and passes its return value. The sentence leaves out that some functions return functions, but the basic behavior described is correct.
- claude: true, claim. With brackets the function runs immediately, and its return value (usually not callable) is what gets passed.
- proposed assert:

```python
def f():
    return 5
r = f()
assert r == 5
assert not callable(r)
```

## functions-as-values: task:functions-as-values-cheapest:hint:0 <!-- fp:d49d0782f2d4 -->

> Read the error: `key=` must be given a function.

- file: w3/a/functions-as-values/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. In beginner terms, key expects a function; strictly, Python accepts any callable for key, and key=None is also allowed.
- claude: true, claim. key must be a callable (or None), and a non-callable value such as a list raises TypeError.
- proposed assert:

```python
try:
    sorted([('a', 2), ('b', 1)], key=[1, 2])
except TypeError:
    pass
else:
    assert False
```

## functions-as-values: remember:1 <!-- fp:d2c52cf8b897 -->

> lambda n: n * 2 is a small function with no name, written right where it is used.

- file: w3/a/functions-as-values/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It describes the usual inline use of lambda expressions. It leaves out that the created function object has **name** '<lambda>' and can be assigned to a name instead of used immediately.
- claude: true, claim. A lambda is an anonymous function, whose name is just '<lambda>'.
- proposed assert:

```python
f = lambda n: n * 2
assert f.__name__ == '<lambda>'
assert f(2) == 4
```

## functions-as-values: remember:2 <!-- fp:1b2c8b19cb35 -->

> Wrap them in list() to see the results.

- file: w3/a/functions-as-values/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. It is an instruction telling the learner to materialize the map/filter iterator with list().
- claude: true, claim. map and filter return lazy iterators, and list() collects their items.
- proposed assert:

```python
assert list(map(str, [1, 2])) == ['1', '2']
assert list(filter(None, [0, 1, 2])) == [1, 2]
assert not isinstance(map(str, [1]), list)
```

## functions-as-values: remember:3 <!-- fp:e0983576d97d -->

> Pass a function by its name, without brackets: key=by_price, not key=by_price(items).

- file: w3/a/functions-as-values/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. It is an instruction to pass the callable itself rather than calling it; `key=by_price(items)` would pass the result of calling `by_price`.
- claude: true, claim. key=by_price passes the function. key=by_price(items) calls it first and passes its result, which normally fails.
- proposed assert:

```python
def by_price(item):
    return item[1]
items = [('a', 3), ('b', 1)]
assert sorted(items, key=by_price) == [('b', 1), ('a', 3)]
try:
    sorted(items, key=by_price(items))
    ok = False
except TypeError:
    ok = True
assert ok
```

## generators: text:3 <!-- fp:807a4dcba440 -->

> A generator over a million numbers never holds a million numbers in memory.

- file: w3/a/generators/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. For a lazy generator, values are produced one at a time rather than all being stored in the generator. It leaves out that the source iterable or the generator's own code can still keep a million values in memory.
- claude: true, claim. A generator keeps only its current state, so its size does not grow with the number of values.
- proposed assert:

```python
import sys
g = (i for i in range(1_000_000))
assert sys.getsizeof(g) < 1000
assert sys.getsizeof(g) < sys.getsizeof(list(range(1000)))
```

## generators: text:6 <!-- fp:ebbf99d6396f -->

> A **generator expression** is a list comprehension in round brackets: it builds a generator instead of a list, which suits functions that only need to walk through the values once, like `sum` or `max`.

- file: w3/a/generators/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. A generator expression is not literally a list comprehension; it shares the comprehension-like syntax but is lazy and single-use. The sentence's main point—that it builds a generator suited to functions like sum or max—is correct.
- claude: true, claim. Round brackets around a comprehension build a generator, and sum and max accept it.
- proposed assert:

```python
import types
g = (n for n in [1, 2, 3])
assert isinstance(g, types.GeneratorType)
assert sum(n for n in [1, 2, 3]) == 6
assert max(n for n in [1, 3, 2]) == 3
```

## generators: text:8 <!-- fp:98d39d66b132 -->

> `map` and `filter` from the last lesson work the same way, which is why they needed `list()` to show their results.

- file: w3/a/generators/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. Both map and filter return lazy iterators in Python 3, so their contents must be consumed to display them; list() is a convenient way, though not the only one (a loop or print(*...) also works).
- claude: true, claim. In Python 3 map and filter return lazy iterators, so list() is needed to see results. 'The same way' depends on the previous lesson, which is not shown.
- proposed assert:

```python
m = map(str, [1, 2])
f = filter(None, [0, 1])
assert not isinstance(m, list) and not isinstance(f, list)
assert iter(m) is m and iter(f) is f
assert list(m) == ["1", "2"] and list(f) == [1]
assert list(m) == []
```

## generators: text:11 <!-- fp:09bfb46d4ae6 -->

> Once a loop, `max` or `list` has walked through it, it is used up: anything after that gets nothing.

- file: w3/a/generators/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. An exhausted generator yields no further items, so list() returns [] and loops run zero times. The sentence leaves out that operations needing a value, such as max() or next(), raise an error instead of returning nothing.
- claude: true, claim. After a full pass the generator is exhausted and later consumers get nothing.
- proposed assert:

```python
g = (i for i in [1, 2])
assert max(g) == 2
assert list(g) == []
g2 = (i for i in [1, 2])
for _ in g2:
    pass
assert list(g2) == []
```

## generators: remember:2 <!-- fp:8e89549aa44d -->

> (n * n for n in items) is a generator expression: a list comprehension in round brackets.

- file: w3/a/generators/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. A generator expression is lazy and yields items one at a time; it is not a list comprehension and does not create a list, even though the syntax looks similar.
- claude: true, claim. Round brackets around a comprehension-like expression give a generator expression.
- proposed assert:

```python
import types
items = [1, 2]
g = (n * n for n in items)
assert isinstance(g, types.GeneratorType)
assert list(g) == [1, 4]
```

## pandas-tables: text:2 <!-- fp:37beb100cbcb -->

> **pandas** does this in one line, and much more after it.

- file: w3/a/pandas-tables/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude simplification)
- deepseek: true, not-a-fact. This is a general descriptive remark rather than a precise checkable claim; pandas.read_csv does read CSV text into a DataFrame in one line, and pandas offers much more beyond that.
- claude: true, simplification. Informal claim that pandas reads CSV in one call and does much more.

## pandas-tables: task:pandas-tables-total:hint:0 <!-- fp:3d2b9fba9e0a -->

> The `?` made pandas read the whole column as text.

- file: w3/a/pandas-tables/lesson.md
- why it is here: deepseek's proposed assert failed: AssertionError
- deepseek: true, claim. By default '?' is not treated as missing, so a numeric column containing it cannot be inferred as numeric and becomes object dtype with string values.
- claude: true, claim. A ? in the column stops numeric parsing, so the whole column is text.
- proposed assert:

```python
import io
import pandas as pd
df = pd.read_csv(io.StringIO('item,price\ntea,3\njam,?\nbun,2\n'))
assert not pd.api.types.is_numeric_dtype(df['price'])
```

## pandas-tables: remember:3 <!-- fp:66de5e698b8b -->

> One bad value (like ?)

- file: w3/a/pandas-tables/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. The sentence is an incomplete noun phrase, not a checkable statement about Python or pandas behavior.
- claude: true, claim. A single non-numeric value like ? makes read_csv read the column as text.
- proposed assert:

```python
import io
import pandas as pd
df = pd.read_csv(io.StringIO('p\n1\n?\n3\n'))
assert not pd.api.types.is_numeric_dtype(df['p'])
```

## numpy-arrays: text:2 <!-- fp:0c5f89edd451 -->

> An array prints without commas.

- file: w3/b/numpy-arrays/lesson.md
- why it is here: deepseek's proposed assert failed: AssertionError
- deepseek: true, claim. A NumPy array's displayed form separates elements with spaces, not commas, for example [1 2 3].
- claude: true, claim. A NumPy array prints elements separated by spaces, with no commas.
- proposed assert:

```python
import numpy as np
assert str(np.array([1, 2, 3])) == '[1 2 3]'
assert ',' not in str(np.array([1.5, 2.5]))
```

## numpy-arrays: text:2 <!-- fp:e86f52592516 -->

> With a million numbers, this is also much faster than a loop.

- file: w3/b/numpy-arrays/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. NumPy vectorized operations run in compiled code, so for a million elements they are much faster than Python-level loops. The statement is accurate for the array operations described, though performance can depend on the specific operation.
- claude: true, simplification. Vectorised NumPy operations are typically far faster than a Python loop on a million numbers. The exact speedup depends on the operation and the machine.
- proposed assert:

```python
import time
import numpy as np
n = 1_000_000
a = np.arange(n)
xs = list(range(n))
start = time.perf_counter()
b = a * 2
arr_time = time.perf_counter() - start
start = time.perf_counter()
c = [x * 2 for x in xs]
loop_time = time.perf_counter() - start
assert arr_time * 3 < loop_time
```

## numpy-arrays: text:8 <!-- fp:6ed488d4bafb -->

> The answers NumPy gives are NumPy numbers.

- file: w3/b/numpy-arrays/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It is a beginner-friendly shorthand for NumPy scalar numeric results; it leaves out that NumPy also returns arrays and non-number values.
- claude: true, claim. NumPy functions and methods return NumPy scalar types such as np.int64 and np.float64, not plain Python numbers.
- proposed assert:

```python
import numpy as np
a = np.array([1, 2, 3])
assert type(a.sum()) is not int
assert isinstance(a.sum(), np.integer)
assert type(a.mean()) is not float
```

## numpy-arrays: task:numpy-arrays-columns:hint:1 <!-- fp:833faae90837 -->

> End with `.tolist()` to give back a plain list.

- file: w3/b/numpy-arrays/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. The sentence is an instruction to use .tolist() when a plain Python list is wanted, not a factual claim to check.
- claude: true, claim. tolist() converts an array to a plain Python list.
- proposed assert:

```python
import numpy as np
r = np.array([1, 2]).sum(axis=0) * np.array([1, 1])
assert type(r.tolist()) is list
```

## numpy-arrays: task:numpy-arrays-doubled:prompt <!-- fp:3438a0ef3fa6 -->

> For `[1, 2, 3]` it returns `[1, 2, 3, 1, 2, 3]`: find and fix the bug.

- file: w3/b/numpy-arrays/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. It describes the exercise's buggy output and asks the learner to find and fix the bug, rather than stating a general Python behavior.
- claude: true, claim. The buggy version values * 2 returns the list repeated, and the learner is asked to fix it.
- proposed assert:

```python
assert [1, 2, 3] * 2 == [1, 2, 3, 1, 2, 3]
```

## numpy-arrays: remember:1 <!-- fp:6ae5b9df5f3b -->

> grid.shape gives (rows, columns); grid[r, c] reads one value and grid[:, c] a whole column; sum(axis=0) adds down the columns.

- file: w3/b/numpy-arrays/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. The shape and indexing clauses are correct for a 2-D NumPy array, but the final clause is not valid as written. Python's built-in sum does not accept an axis argument; it must be grid.sum(axis=0) or np.sum(grid, axis=0).
- claude: true, claim. shape gives (rows, columns), grid[r, c] reads one value, grid[:, c] is a column, and sum(axis=0) adds down the columns.
- proposed assert:

```python
import numpy as np
g = np.array([[1, 2, 3], [4, 5, 6]])
assert g.shape == (2, 3)
assert g[1, 2] == 6
assert g[:, 1].tolist() == [2, 5]
assert g.sum(axis=0).tolist() == [5, 7, 9]
```

## search-sort: text:0 <!-- fp:38ccdf0a993c -->

> To find a value in a list, the simplest way is to look at every item in turn until it turns up.

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude simplification)
- deepseek: true, advice. This recommends an approach (checking items one by one until a match) rather than stating a checkable fact; "simplest" is a judgment call, and the description of linear search is accurate.
- claude: true, simplification. Scanning every item in turn is the simplest approach. It leaves out that sorted data allows faster methods like binary search, and that sets or dicts avoid scanning.

## search-sort: text:0 <!-- fp:68158bbd3253 -->

> This is a **linear search**.

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude doc:https://docs.python.org/3/library/stdtypes.html#common-sequence-operations)
- deepseek: true, not-a-fact. The sentence names the technique just described (checking items one by one until found), which is correctly called a linear search; it makes no checkable claim about Python's behavior.
- claude: true, doc:https://docs.python.org/3/library/stdtypes.html#common-sequence-operations. Checking each item in turn until a match is found is the standard definition of linear (sequential) search.

## search-sort: task:search-sort-find-all:hint:0 <!-- fp:dd7982efb35a -->

> Loop with `for i, x in enumerate(items):` and keep the matching `i`s in a list.

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. This is an instruction to write a loop and collect indices, not a factual claim about Python behavior.
- claude: true, advice. It is a hint recommending enumerate in a loop to collect matching indexes.

## search-sort: text:4 <!-- fp:219a584b8a7a -->

> When the list is **sorted**, there is a much faster way, like finding a word in a dictionary.

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. For a sorted sequence, binary search halves the remaining range each step, so on large lists it needs far fewer probes than a linear scan. The assertion checks this behavior on a sorted list of one million items.
- claude: true, simplification. Binary search is much faster on sorted data. It leaves out that it needs random access, which lists have.
- proposed assert:

```python
data = list(range(1_000_000))
target = 999_999

linear_steps = 0
for value in data:
    linear_steps += 1
    if value == target:
        break

lo, hi = 0, len(data)
binary_steps = 0
while lo < hi:
    binary_steps += 1
    mid = (lo + hi) // 2
    if data[mid] < target:
        lo = mid + 1
    else:
        hi = mid

assert data[lo] == target
assert binary_steps < linear_steps
```

## search-sort: text:4 <!-- fp:511c69f337f2 -->

> Look at the middle item: if it is too small, the target can only be in the right half, so throw the left half away, and repeat.

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. For an ascending sorted list, if the middle item is less than the target, every item to its left is also less, so the target cannot be in the left half. The sentence assumes the usual ascending sort.
- claude: true, simplification. Describes the binary search idea for ascending order. It leaves out the cases where the middle item is too big or equal.
- proposed assert:

```python
xs = [1, 3, 5, 7, 9]
mid = 2
target = 7
assert xs[mid] < target
assert target in xs[mid + 1:]
assert target not in xs[:mid + 1]
```

## search-sort: text:4 <!-- fp:77af3bdbf8e5 -->

> Each step halves what is left, so a million items take about 20 steps.

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. Binary search roughly halves the remaining search space each comparison, and log2(1,000,000) is about 20; the exact worst-case count depends on rounding and details like whether the target is present.
- claude: true, claim. log2 of a million is about 19.9, so about 20 halvings.
- proposed assert:

```python
import math
assert math.ceil(math.log2(1_000_000)) == 20
```

## search-sort: text:7 <!-- fp:436fccfba9f6 -->

> Python's `bisect` module does the halving for you.

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek doc:https://docs.python.org/3/library/bisect.html#module-bisect, claude claim)
- deepseek: true, doc:https://docs.python.org/3/library/bisect.html#module-bisect. The bisect module implements a bisection/binary-search algorithm, which repeatedly halves the search interval. This is accurate for Python 3.12 and newer.
- claude: true, claim. bisect implements binary search on sorted lists.
- proposed assert:

```python
import bisect
assert bisect.bisect_left([1, 3, 5, 7], 5) == 2
```

## search-sort: text:7 <!-- fp:66a9041c2cfd -->

> `insort` adds a value at that place.

- file: w3/b/search-sort/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. `insort` is `insort_right`: with existing equal values it inserts after them, whereas `bisect_left` returns the leftmost insertion index. So it does not add at that place in that case.
- claude: true, simplification. insort inserts and keeps the list sorted. With duplicates it inserts after equal items (insort_right), not at the bisect_left spot.
- proposed assert:

```python
from bisect import bisect_left, insort
items = [1, 2, 2, 3]
x = 2.0
i = bisect_left(items, x)
insort(items, x)
assert items[i] is x
```

## search-sort: text:13 <!-- fp:53791f00f24e -->

> `9` is right there at index 0, but the search on the unsorted list says it would go at the end.

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. Binary search/bisect assumes sorted input; on an unsorted list it can report a wrong insertion point, as with a descending list whose first element is 9.
- claude: true, simplification. Refers to an example not shown here. It is plausible given how bisect works on unsorted data.
- proposed assert:

```python
import bisect
items = [9, 8, 7]
assert items[0] == 9
assert bisect.bisect_left(items, 9) == len(items)
```

## search-sort: text:13 <!-- fp:4da2ab1d8183 -->

> Sort first.

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. It is an instruction to sort before searching, not a factual claim about Python behavior.
- claude: true, advice. Advice to sort before a binary search.

## search-sort: text:13 <!-- fp:09a999c21579 -->

> (Sorting costs more than one linear search, so it pays off when you search the same list many times; for a single lookup, `x in items` is simpler.)

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude simplification)
- deepseek: true, advice. It recommends sorting when the same list is searched repeatedly and using `x in items` for a single lookup. The complexity reasoning is sound in general, though constant factors and tiny lists are left out.
- claude: true, simplification. Sorting is O(n log n) and one linear search is O(n), so sorting pays off with many searches. It leaves out the case where the data is already sorted.

## search-sort: task:search-sort-member:hint:0 <!-- fp:a9fe7b27537b -->

> `bisect_left` does a binary search.

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek doc:https://docs.python.org/3/library/bisect.html#module-bisect, claude doc:https://docs.python.org/3/library/bisect.html#bisect.bisect_left)
- deepseek: true, doc:https://docs.python.org/3/library/bisect.html#module-bisect. The bisect documentation states that the module uses a basic bisection algorithm, and bisect_left is one of its binary-search functions.
- claude: true, doc:https://docs.python.org/3/library/bisect.html#bisect.bisect_left. The bisect module uses a bisection algorithm and bisect_left locates the insertion point in a sorted list.

## search-sort: task:search-sort-score:prompt <!-- fp:1270dc54bfae -->

> (A binary search needs sorted data.)

- file: w3/b/search-sort/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. Standard binary search assumes the data is sorted by the comparison used; otherwise it can discard the half that contains the target and return a wrong answer.
- claude: true, simplification. Binary search needs sorted data to be correct. It leaves out that sorting must match the comparison used.
- proposed assert:

```python
def binary_search(a, x):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo < len(a) and a[lo] == x

assert binary_search([20, 40, 70, 90], 90) is True
assert binary_search([90, 20, 70, 40], 90) is False
```

## search-sort: remember:1 <!-- fp:61063d13db8e -->

> A binary search halves a sorted list at each step: about 20 steps for a million items.

- file: w3/b/search-sort/lesson.md
- why it is here: deepseek's proposed assert failed: AssertionError
- deepseek: true, claim. Binary search halves the search interval; log2(1,000,000) is about 19.93, so 20 comparisons suffice.
- claude: true, claim. A million items need about log2(1e6), roughly 20, halvings.
- proposed assert:

```python
import math
assert math.ceil(math.log2(1_000_000)) == 20
```

## statistics: text:0 <!-- fp:589fdb77ac8b -->

> A few numbers sum up a list of measurements: where its middle is, and how spread out it is.

- file: w3/b/statistics/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude simplification)
- deepseek: true, not-a-fact. This is an introductory description of summary statistics, not a statement about Python behavior.
- claude: true, simplification. Center and spread are the usual summaries. Other summaries exist.

## statistics: text:0 <!-- fp:aef1584757b5 -->

> The **median** is the middle value once the list is sorted.

- file: w3/b/statistics/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. For an even number of values there is no single middle value; Python's median is the average of the two middle values. The sentence is only correct for an odd-length list.
- claude: true, simplification. Correct for an odd count. The next paragraph covers the even count.
- proposed assert:

```python
import statistics
for n in range(1, 10):
    data = list(range(n))
    assert statistics.median(data) == data[n // 2]
```

## statistics: text:5 <!-- fp:3ba19bb0cca9 -->

> The **range** (largest minus smallest) is the simplest spread.

- file: w3/b/statistics/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. The range is indeed defined as the largest value minus the smallest value; calling it the simplest spread is a harmless description.
- claude: true, simplification. It defines the range as a spread measure. It leaves out that the range is very sensitive to outliers.
- proposed assert:

```python
values = [4, 9, 1, 7]
assert max(values) - min(values) == 8
```

## statistics: text:11 <!-- fp:1a03744101b9 -->

> The mean uses every value, so a single huge one drags it far away.

- file: w3/b/statistics/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It is a simplified statistical statement: an outlier shifts the arithmetic mean by its deviation divided by the number of values, and how 'far' is relative.
- claude: true, claim. One huge value changes the mean a lot.
- proposed assert:

```python
import numpy as np
a = [3, 4, 3, 5]
b = a + [1000]
assert np.mean(b) > 100 * np.mean(a)
```

## statistics: text:11 <!-- fp:4eae4dc71fda -->

> The median only looks at the middle, so it hardly moves.

- file: w3/b/statistics/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that with an even number of values the median averages the two middle values, and changing enough values can shift the middle. As a beginner-level description of robustness to outliers, it is acceptable.
- claude: true, claim. A huge extra value shifts the median only a little.
- proposed assert:

```python
import numpy as np
a = [3, 4, 3, 5]
b = a + [1000]
assert np.median(a) == 3.5
assert np.median(b) == 4.0
```

## statistics: task:statistics-typical:prompt <!-- fp:ed59506b70c4 -->

> With an even number of prices, return the mean of the two middle values, so `[2, 4, 6, 100]` gives `5.0`.

- file: w3/b/statistics/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. It describes the exercise's expected median rule, and the example is correct: the middle values of [2, 4, 6, 100] are 4 and 6, whose mean is 5.0.
- claude: true, claim. The median of [2, 4, 6, 100] is the mean of 4 and 6, which is 5.0.
- proposed assert:

```python
import statistics
import numpy as np
assert statistics.median([2, 4, 6, 100]) == 5.0
assert np.median([2, 4, 6, 100]) == 5.0
```

## statistics: task:statistics-typical:prompt <!-- fp:7761d407507e -->

> For `[3, 4, 3, 5, 90]` it returns `21.0` instead of `4.0`: find and fix the bug.

- file: w3/b/statistics/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. The sentence describes the buggy output in the exercise and asks the learner to fix it, rather than making a general claim about Python behavior.
- claude: true, claim. The mean of [3, 4, 3, 5, 90] is 105/5 = 21.0 and the median is 4. The sentence also tells the learner to fix the bug.
- proposed assert:

```python
import numpy as np
x = [3, 4, 3, 5, 90]
assert np.mean(x) == 21.0
assert np.median(x) == 4.0
```

## statistics: task:statistics-typical:hint:0 <!-- fp:61c289dea4be -->

> The mean uses every value, the 90 too.

- file: w3/b/statistics/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. The 90th percentile is an order statistic: changing a value outside the relevant rank can leave it unchanged, even though the mean changes. So it does not use every value the way the mean does.
- claude: true, claim. The mean includes the 90, which pulls it up.
- proposed assert:

```python
import numpy as np
assert np.mean([3, 4, 3, 5, 90]) == 21.0
assert np.mean([3, 4, 3, 5]) == 3.75
```

## statistics: remember:1 <!-- fp:cb32bba8b598 -->

> The range (max minus min) and the standard deviation say how spread out the values are.

- file: w3/b/statistics/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude simplification)
- deepseek: true, not-a-fact. This is a general statistics statement, not a checkable claim about Python behavior; it is broadly correct as a beginner explanation.
- claude: true, simplification. Both are measures of spread. The sentence does not say how they differ in outlier sensitivity.

## statistics: remember:3 <!-- fp:6a17f1a58ee8 -->

> One huge value drags the mean but hardly moves the median: use the median for a typical value.

- file: w3/b/statistics/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude claim)
- deepseek: true, advice. The median is resistant to a single large outlier, while the mean is pulled toward it; this is a standard statistical rule of thumb, not a Python API fact.
- claude: true, claim. One outlier moves the mean far and the median little. Using the median for a typical value is the usual advice.
- proposed assert:

```python
import numpy as np
a = [10, 11, 12, 13, 14]
b = a[:-1] + [1000]
assert np.mean(b) - np.mean(a) > 100
assert np.median(b) == np.median(a)
```

## knn-sklearn: text:0 <!-- fp:3113e5b4cdea -->

> The examples go in `X`, a list of rows with one list of features each, and their labels go in `y`.

- file: w3/c/knn-sklearn/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. In scikit-learn, X is an array-like feature matrix, commonly written as a list of rows, but NumPy arrays and pandas DataFrames also work; y holds the labels. The sentence leaves out those other accepted types.
- claude: true, claim. scikit-learn accepts X as a list of rows of features and y as a list of labels.
- proposed assert:

```python
from sklearn.neighbors import KNeighborsClassifier
X = [[0, 0], [1, 1], [10, 10]]
y = ['a', 'a', 'b']
m = KNeighborsClassifier(n_neighbors=1).fit(X, y)
assert m.predict([[9, 9]])[0] == 'b'
```

## knn-sklearn: text:5 <!-- fp:d9d1cbbbdebb -->

> A small k follows every single example, odd ones too; a big k listens to the crowd, and with k as big as the data it always says the most common label.

- file: w3/c/knn-sklearn/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. With k equal to the number of training points, a tie in class counts has no single most common label; scikit-learn still returns one tied label. The sentence's 'always' is therefore false.
- claude: true, claim. With k=1 an odd example decides the label. With k equal to the number of examples (uniform weights) every prediction is the majority label.
- proposed assert:

```python
from sklearn.neighbors import KNeighborsClassifier
X = [[0],[1],[2],[3],[10]]
y = ['a','a','a','a','b']
assert KNeighborsClassifier(n_neighbors=1).fit(X, y).predict([[10]]).tolist() == ['b']
m = KNeighborsClassifier(n_neighbors=5).fit(X, y)
assert m.predict([[10]]).tolist() == ['a']
assert m.predict([[-100]]).tolist() == ['a']
```

## knn-sklearn: text:10 <!-- fp:f8aeaaf6d5ed -->

> `predict` always takes a **list of rows**, like `X`, even when you ask about one point.

- file: w3/c/knn-sklearn/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. scikit-learn's predict accepts any array-like of shape (n_samples, n_features), not only a list of rows. A NumPy array or pandas DataFrame works for one point as shape (1, n_features).
- claude: true, claim. predict needs a 2D input, a list of rows, even for one sample.
- proposed assert:

```python
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1).fit([[0,0],[10,10]], ['a','b'])
assert m.predict([[8, 8]]).tolist() == ['b']
try:
    m.predict([8, 8])
    raise SystemExit('no error')
except ValueError:
    pass
```

## knn-sklearn: text:10 <!-- fp:75a751f7ed69 -->

> One point is a list holding one row:

- file: w3/c/knn-sklearn/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It simplifies scikit-learn's input to a Python list for a single sample. It leaves out that any 2-D array-like with one row, such as a NumPy array or pandas DataFrame, also works.
- claude: true, claim. A single point is passed as a list containing one row.
- proposed assert:

```python
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1).fit([[0,0],[10,10]], ['a','b'])
assert len(m.predict([[8, 8]])) == 1
```

## knn-sklearn: task:knn-sklearn-one-point:hint:0 <!-- fp:2762cbe6fb42 -->

> `predict` wants a list of rows.

- file: w3/c/knn-sklearn/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that scikit-learn's predict accepts any 2D array-like, such as NumPy arrays or pandas DataFrames, not only a Python list. A list of equal-length rows is one valid beginner-friendly form.
- claude: true, claim. predict expects a list of rows (2D input).
- proposed assert:

```python
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1).fit([[0],[10]], ['a','b'])
assert m.predict([[9]]).tolist() == ['b']
```

## knn-sklearn: task:knn-sklearn-one-point:hint:1 <!-- fp:649412122301 -->

> Put the single row `[x, z]` inside another pair of brackets, then take the first label from the result with `tolist()[0]`.

- file: w3/c/knn-sklearn/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, not-a-fact. The instruction's claimed effect is wrong: after wrapping the row, `tolist()[0]` returns the whole first row `[x, z]`, not the first individual label (which would need another `[0]`).
- claude: true, not-a-fact. A hint instructing the learner.

## knn-sklearn: remember:0 <!-- fp:167db42fde20 -->

> X is a list of rows (one list of features per example); y is the list of their labels.

- file: w3/c/knn-sklearn/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude simplification)
- deepseek: true, not-a-fact. It describes what the variables X and y represent in the exercise, not a Python behavior.
- claude: true, simplification. Convention for the course. X and y can also be NumPy arrays or DataFrames, which this leaves out.

## nearest-neighbour: text:2 <!-- fp:eb15eb8cc663 -->

> A point can have as many numbers as you like: one per thing you measured (height, weight, age...).

- file: w3/c/nearest-neighbour/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It treats a point as any list of measurements; it leaves out that all points in one dataset normally need the same number of features.
- claude: true, claim. math.dist accepts points of any equal number of coordinates, so a point can have many numbers.
- proposed assert:

```python
import math
assert math.dist((0, 0, 0, 0, 0), (1, 1, 1, 1, 0)) == 2.0
```

## nearest-neighbour: text:2 <!-- fp:afd9a984552c -->

> Each number is a **feature**.

- file: w3/c/nearest-neighbour/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude not-a-fact)
- deepseek: true, simplification. It is acceptable for beginners, though strictly each number is a feature value belonging to a feature such as height or weight.
- claude: true, not-a-fact. Defines the term 'feature'.

## nearest-neighbour: task:nearest-neighbour-closest:hint:0 <!-- fp:e58e5dfc15a4 -->

> `min` with a `key` picks the point with the smallest distance.

- file: w3/c/nearest-neighbour/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. min returns the item with the smallest key value, not necessarily the smallest distance; that holds only when the key function computes distance.
- claude: true, claim. min(points, key=...) returns the item whose key value is smallest.
- proposed assert:

```python
import math
points = [(5, 5), (1, 1), (9, 9)]
target = (2, 2)
assert min(points, key=lambda p: math.dist(p, target)) == (1, 1)
```

## nearest-neighbour: text:5 <!-- fp:2f670df77508 -->

> To label a new point, find the **nearest** known point and copy its label.

- file: w3/c/nearest-neighbour/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude simplification)
- deepseek: true, not-a-fact. The sentence describes the 1-nearest-neighbour algorithm rather than Python or library behavior. It is a correct description of that basic method.
- claude: true, simplification. Describes 1-nearest-neighbour. It leaves out ties and the choice of distance.

## nearest-neighbour: text:7 <!-- fp:69bd60c7869a -->

> With one neighbour, one odd example can mislead you.

- file: w3/c/nearest-neighbour/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. This is a conceptual explanation about 1-nearest-neighbor classification, not a checkable Python behavior. With k=1, a single noisy or unusual nearest example can determine the prediction.
- claude: true, claim. With k=1 a single mislabelled or odd example decides the result, while k=3 outvotes it.
- proposed assert:

```python
from sklearn.neighbors import KNeighborsClassifier
X = [[0],[1],[2],[3],[4]]
y = ['a','a','b','a','a']
assert KNeighborsClassifier(n_neighbors=1).fit(X, y).predict([[2.1]]).tolist() == ['b']
assert KNeighborsClassifier(n_neighbors=3).fit(X, y).predict([[2.1]]).tolist() == ['a']
```

## nearest-neighbour: text:7 <!-- fp:307dacaef8d4 -->

> Taking the **k** nearest and letting them vote is steadier.

- file: w3/c/nearest-neighbour/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude simplification)
- deepseek: true, advice. It recommends k-neighbor voting over relying on a single neighbor; details such as choosing k, ties, and distance weighting are omitted.
- claude: true, simplification. Usually more robust to odd examples than k=1. It leaves out that a too-large k blurs real differences.

## nearest-neighbour: text:11 <!-- fp:85cb8d8f3352 -->

> The grams swamp the metres.

- file: w3/c/nearest-neighbour/lesson.md
- why it is here: the two families name different backing (deepseek simplification, claude not-a-fact)
- deepseek: true, simplification. It is a teaching shorthand: the gram column's larger numeric range dominates the distance calculation, though the real cause is the numeric scale and metric, not the unit name itself.
- claude: true, not-a-fact. It comments on the example's result in the course's own words.

## nearest-neighbour: text:11 <!-- fp:beea83ff4c61 -->

> The fix is to **scale** every column to the same range, 0 for its smallest value and 1 for its largest, before measuring:

- file: w3/c/nearest-neighbour/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. Min-max scaling to the default (0, 1) range maps each column's smallest value to 0 and largest to 1.
- claude: true, simplification. It describes min-max scaling, one common way to scale. It leaves out other methods such as standardising.
- proposed assert:

```python
import numpy as np
from sklearn.preprocessing import MinMaxScaler
X = np.array([[1.0, 10.0], [2.0, 30.0], [5.0, 20.0]])
S = MinMaxScaler().fit_transform(X)
for j in range(X.shape[1]):
    assert S[:, j].min() == 0.0
    assert S[:, j].max() == 1.0
    assert S[X[:, j].argmin(), j] == 0.0
    assert S[X[:, j].argmax(), j] == 1.0
```

## train-test: text:0 <!-- fp:874a8a00bd08 -->

> Ask it about examples whose labels you know, and count how often it is right: that share is its **accuracy**.

- file: w3/c/train-test/lesson.md
- why it is here: the two families name different backing (deepseek claim, claude simplification)
- deepseek: true, claim. Accuracy is the fraction of predictions that match the known labels, which scikit-learn's accuracy_score computes.
- claude: true, simplification. Accuracy is the share of correct predictions. It leaves out that the examples should be ones the model has not seen.
- proposed assert:

```python
from sklearn.metrics import accuracy_score
y_true = [0, 1, 1, 0]
y_pred = [0, 1, 0, 0]
assert accuracy_score(y_true, y_pred) == 0.75
```

## train-test: text:2 <!-- fp:5ce5df55ef93 -->

> A model's `score(X, y)` predicts every row of `X` and gives the accuracy against `y` in one go.

- file: w3/c/train-test/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. In scikit-learn, `score` is estimator-specific: classifiers usually return accuracy, but regressors return R² (and other estimators can use other metrics). The sentence is only true for classifier-like models, not for a model in general.
- claude: true, claim. For scikit-learn classifiers, score predicts X and returns the mean accuracy against y. Regressors return R² instead, but the context is classification.
- proposed assert:

```python
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=1).fit([[0], [1], [2], [3]], [0, 0, 1, 1])
assert m.score([[0], [3]], [0, 0]) == 0.5
assert m.score([[0], [3]], [0, 1]) == 1.0
```

## train-test: task:train-test-accuracy:hint:0 <!-- fp:affdb5a6ecdd -->

> Count the matches with `zip(truth, guesses)`, then divide by the length.

- file: w3/c/train-test/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. It is an instruction for computing a match rate rather than a claim about Python behavior. It assumes the two sequences have the same nonzero length so that “the length” is clear.
- claude: true, advice. It is a hint on how to solve the exercise.

## train-test: text:5 <!-- fp:4f8afae4c788 -->

> Not the ones it learned from: that is like giving a class the exam's answers the day before.

- file: w3/c/train-test/lesson.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. This is an explanatory analogy about not testing on training data, not a checkable statement about Python behavior.
- claude: true, advice. It advises against evaluating on training data, using an analogy.

## train-test: text:5 <!-- fp:b466e23d064c -->

> `random_state` fixes the shuffle, so every run gives the same split (and the same results).

- file: w3/c/train-test/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. `train_test_split`'s `random_state` fixes only the split; a model or scoring step with its own unseeded randomness can still produce different results.
- claude: true, claim. The same random_state gives the same shuffle and so the same split on every run.
- proposed assert:

```python
from sklearn.model_selection import train_test_split
X = list(range(20))
a = train_test_split(X, random_state=1)
b = train_test_split(X, random_state=1)
assert a == b
```

## train-test: task:train-test-evaluate:hint:0 <!-- fp:c923ff2136f4 -->

> `train_test_split` returns four lists: train inputs, test inputs, train labels, test labels.

- file: w3/c/train-test/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. `train_test_split` preserves the input container type; with NumPy arrays or pandas objects it returns arrays/Series/DataFrames, not lists. It returns lists only when the inputs themselves are lists.
- claude: true, claim. With list inputs X and y it returns four lists, in the order X_train, X_test, y_train, y_test. With arrays it returns arrays, but the course passes lists.
- proposed assert:

```python
from sklearn.model_selection import train_test_split
X = [[i] for i in range(8)]
y = list(range(8))
r = train_test_split(X, y, test_size=0.25, random_state=0)
assert len(r) == 4 and all(isinstance(p, list) for p in r)
Xtr, Xte, ytr, yte = r
assert len(Xtr) == len(ytr) == 6 and len(Xte) == len(yte) == 2
assert [x[0] for x in Xte] == yte
```

## train-test: text:9 <!-- fp:60eb7e1bf96d -->

> A model that has seen an example knows its label.

- file: w3/c/train-test/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude false)
- deepseek: false, claim. This overgeneralizes: only memorizing models such as 1-nearest-neighbour reliably reproduce training labels; a 3-nearest-neighbour model can misclassify a point it was trained on.
- claude: false, simplification. Only some models, like 1-nearest-neighbour, effectively memorise training labels. Many models, such as a linear model, still get training examples wrong.
- proposed assert:

```python
from sklearn.neighbors import KNeighborsClassifier
X = [[0.0], [0.1], [0.2]]
y = [0, 1, 1]
model = KNeighborsClassifier(n_neighbors=3).fit(X, y)
assert model.predict([[0.0]])[0] == y[0]
```

## train-test: task:train-test-honest:hint:1 <!-- fp:549f37bf8f88 -->

> Score the model on the test inputs and test labels, not the training ones.

- file: w3/c/train-test/lesson.md
- why it is here: the two families name different backing (deepseek advice, claude not-a-fact)
- deepseek: true, advice. This is a recommendation about model evaluation, not a claim about Python behavior. Using test data avoids misleadingly optimistic training-set scores.
- claude: true, not-a-fact. An instruction.

## train-test: remember:0 <!-- fp:a0e46d243bd0 -->

> model.score(X, y) is the accuracy: the share of rows it labels right, from 0.0 to 1.0.

- file: w3/c/train-test/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. In scikit-learn, model.score(X, y) returns accuracy only for classifiers; for regressors it returns R², which can be negative or above 1. The sentence does not say it applies only to classifiers.
- claude: true, claim. For scikit-learn classifiers, score is the mean accuracy, between 0.0 and 1.0.
- proposed assert:

```python
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
X = np.array([[0], [1], [2], [3]])
y = np.array([0, 0, 1, 1])
m = KNeighborsClassifier(n_neighbors=1).fit(X, y)
assert m.score(np.array([[0], [3]]), np.array([0, 0])) == 0.5
assert 0.0 <= m.score(X, y) <= 1.0
```

## train-test: remember:3 <!-- fp:4dbb4f716afe -->

> Scoring a model on the data it learned from looks too good: a 1-neighbour model scores 1.0 there.

- file: w3/c/train-test/lesson.md
- why it is here: verdicts differ or doubt it (deepseek false, claude true)
- deepseek: false, claim. A 1-neighbour model does not always score 1.0 on its training data: if identical training points have different labels, scikit-learn can predict one of them wrongly. The score is only guaranteed to be 1.0 when no such conflicting duplicates exist.
- claude: true, simplification. Leaves out the case of identical rows with different labels, where a 1-neighbour model scores below 1.0 on its training data.
- proposed assert:

```python
from sklearn.neighbors import KNeighborsClassifier
X = [[0.0], [0.0]]
y = [0, 1]
clf = KNeighborsClassifier(n_neighbors=1).fit(X, y)
assert clf.score(X, y) == 1.0
```

## guessing-stone: boss:intro <!-- fp:65820e4200b8 -->

> The last lines, under `if __name__ == "__main__":`, start the game only when the whole program runs; the first two stages check your functions on their own.

- file: w1/a/boss/boss.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. It describes the exercise's stage checks and main-block layout rather than making a single checkable Python claim; the guarded block does run only on direct execution.
- claude: true, claim. Code under the **main** guard runs only when the file is run as the main program, not when it is imported.
- proposed assert:

```python
ns = {'__name__': 'other'}
exec('ran = False\nif __name__ == "__main__":\n    ran = True', ns)
assert ns['ran'] is False
ns = {'__name__': '__main__'}
exec('ran = False\nif __name__ == "__main__":\n    ran = True', ns)
assert ns['ran'] is True
```

## guessing-stone: boss:intro <!-- fp:36e115f6dc93 -->

> In a real game you would let Python pick it: `import random`, then `random.randint(1, 100)` gives a whole number from 1 to 100.

- file: w1/a/boss/boss.md
- why it is here: boss text has no claim blocks: move the fact into a lesson or mark it by hand
- deepseek: true, claim. random.randint(1, 100) returns an integer N with 1 <= N <= 100, so it gives a whole number in that inclusive range.
- claude: true, claim. random.randint(a, b) returns a whole number from a to b, both ends included.
- proposed assert:

```python
import random
vals = {random.randint(1, 100) for _ in range(20000)}
assert all(isinstance(v, int) for v in vals)
assert min(vals) == 1 and max(vals) == 100
```

## guessing-stone: stage:guessing-read:prompt <!-- fp:41db620391f1 -->

> `text.strip()` removes the spaces around the text, `text.isdecimal()` is True when every character is a digit, and `None` is Python's value for "nothing".

- file: w1/a/boss/boss.md
- why it is here: the two families name different backing (deepseek simplification, claude claim)
- deepseek: true, simplification. It leaves out that `strip()` removes all leading/trailing whitespace, not only spaces; `isdecimal()` requires at least one decimal character and excludes some Unicode digit characters; and `None` is a singleton object representing no value, not literally nothing.
- claude: true, claim. strip removes surrounding whitespace, isdecimal is True for a non-empty string of decimal digits, and None means no value. An empty string gives False, a minor edge case.
- proposed assert:

```python
assert '  42 '.strip() == '42'
assert '42'.isdecimal() is True
assert '4a'.isdecimal() is False
assert '-4'.isdecimal() is False
assert [].sort() is None
```

## guessing-stone: stage:guessing-play:prompt <!-- fp:6c5d7ba81af7 -->

> After 5 wrong guesses it prints `Out of guesses. It was SECRET.` Inside a loop, `continue` jumps straight to the next round and `return` leaves the function.

- file: w1/a/boss/boss.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. The sentence describes the exercise's specified stopping condition and correctly states the basic effects of continue and return in a loop.
- claude: true, claim. In a loop, continue skips to the next iteration and return exits the whole function. The first part is the exercise spec.
- proposed assert:

```python
def f():
    out = []
    for i in range(5):
        if i == 1:
            continue
        if i == 3:
            return out
        out.append(i)
    out.append('end')
    return out
assert f() == [0, 2]
```

## gradebook: stage:gradebook-parse:prompt <!-- fp:2de7b4b65a12 -->

> A line with no marks, like `"Ines:"`, gives an empty list: `"".split(",")` is `[""]`, so skip empty pieces before calling `int()`.

- file: w1/b/boss/boss.md
- why it is here: boss text has no claim blocks: move the fact into a lesson or mark it by hand
- deepseek: true, claim. In Python, splitting an empty string with a non-empty separator returns a one-element list containing the empty string; passing that empty string to int() raises ValueError.
- claude: true, claim. "".split(",") does return [""], so empty pieces must be skipped before int().
- proposed assert:

```python
assert ''.split(',') == ['']
parts = 'Ines:'.split(':')
assert parts == ['Ines', '']
assert [int(p) for p in parts[1].split(',') if p.strip()] == []
```

## gradebook: stage:gradebook-parse:prompt <!-- fp:785dc54b7b73 -->

> Split the line on `:` first and strip each piece, since `"Ines:".split(": ")` finds no `": "` at all.

- file: w1/b/boss/boss.md
- why it is here: boss text has no claim blocks: move the fact into a lesson or mark it by hand
- deepseek: true, claim. The string "Ines:" ends with a colon and has no colon-then-space substring, so splitting on ": " returns the whole string in a one-element list.
- claude: true, claim. "Ines:" has no ": " (colon followed by a space), so splitting on that finds nothing. Splitting on ":" and stripping works.
- proposed assert:

```python
assert 'Ines:'.split(': ') == ['Ines:']
name, rest = [p.strip() for p in 'Ines:'.split(':', 1)]
assert name == 'Ines' and rest == ''
```

## gradebook: stage:gradebook-ranking:prompt <!-- fp:59ca71d3bcdd -->

> Tip: `sorted(pairs, key=lambda pair: (-pair[1], pair[0]))` sorts by average, highest first, then by name.

- file: w1/b/boss/boss.md
- why it is here: boss text has no claim blocks: move the fact into a lesson or mark it by hand
- deepseek: true, claim. The key tuple sorts ascending by -average, so larger averages come first, and ties are broken by the name.
- claude: true, claim. Negating the average sorts highest first, and the name breaks ties alphabetically.
- proposed assert:

```python
pairs = [('Bo', 10.0), ('Al', 12.5), ('Cy', 10.0), ('Di', 7.0)]
assert sorted(pairs, key=lambda pair: (-pair[1], pair[0])) == [('Al', 12.5), ('Bo', 10.0), ('Cy', 10.0), ('Di', 7.0)]
```

## lost-satchel: stage:satchel-parse:prompt <!-- fp:696c78488a4e -->

> `parse(command)` returns a `(verb, noun)` pair in lower case: `parse("Take Lamp")` is `("take", "lamp")`, `parse("look")` is `("look", "")` and `parse("")` is `("", "")`.

- file: w1/c/boss/boss.md
- why it is here: the two families name different backing (deepseek claim, claude not-a-fact)
- deepseek: true, claim. The examples match lower-casing the command and splitting it into a verb and optional noun, with empty input giving two empty strings.
- claude: true, not-a-fact. Specification of the function the learner writes.
- proposed assert:

```python
def parse(command):
    parts = command.lower().split()
    if not parts:
        return ('', '')
    return (parts[0], parts[1] if len(parts) > 1 else '')
assert parse('Take Lamp') == ('take', 'lamp')
assert parse('look') == ('look', '')
assert parse('') == ('', '')
```

## songbird-playlist: stage:playlist-song:prompt <!-- fp:82bd5671a5ad -->

> Make `Song` a dataclass with fields `title` (str) and `seconds` (int), so `Song("Dawn", 90)` shows as `Song(title='Dawn', seconds=90)` and equals another `Song("Dawn", 90)`.

- file: w2/b/boss/boss.md
- why it is here: boss text has no claim blocks: move the fact into a lesson or mark it by hand
- deepseek: true, claim. A dataclass generates **repr** and **eq** by default, so the constructor call with those fields gives exactly that repr and compares equal to another Song with the same values.
- claude: true, claim. A dataclass generates a repr in that form and an **eq** that compares the fields.
- proposed assert:

```python
from dataclasses import dataclass

@dataclass
class Song:
    title: str
    seconds: int

assert repr(Song("Dawn", 90)) == "Song(title='Dawn', seconds=90)"
assert Song("Dawn", 90) == Song("Dawn", 90)
```

## songbird-playlist: stage:playlist-find:prompt <!-- fp:7e37130350bb -->

> `"Dawn" in playlist` should be `True` when a song has that title: write `__contains__(self, title)`, which `in` calls for you.

- file: w2/b/boss/boss.md
- why it is here: boss text has no claim blocks: move the fact into a lesson or mark it by hand
- deepseek: true, claim. Python's `in` operator calls the object's `__contains__` method when it exists, passing the left-hand value as the argument.
- claude: true, claim. The `in` operator calls the right operand's **contains** method.
- proposed assert:

```python
class P:
    def __contains__(self, title):
        return title == "Dawn"

assert "Dawn" in P()
assert "Dusk" not in P()
```

## ranger-registry: stage:registry-animals:prompt <!-- fp:269a58c546f9 -->

> Remember `super().__init__(...)`.

- file: w2/c/boss/boss.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. This is a reminder/instruction to call the parent initializer, not a factual claim about Python behavior.
- claude: true, advice. A reminder to call the parent initializer in a subclass. It is good practice and needed here for name and species.

## sales-report: stage:sales-read:prompt <!-- fp:ec0adcc7fede -->

> With pandas, `df.to_dict("records")` gives one dict per row.

- file: w3/a/boss/boss.md
- why it is here: boss text has no claim blocks: move the fact into a lesson or mark it by hand
- deepseek: true, claim. DataFrame.to_dict('records') returns a list with one dictionary per row, mapping column names to row values.
- claude: true, claim. DataFrame.to_dict("records") returns a list with one dict per row.
- proposed assert:

```python
import pandas as pd
df = pd.DataFrame({'product': ['lamp', 'rope'], 'quantity': [2, 1], 'price': [12.5, 3.0]})
r = df.to_dict('records')
assert isinstance(r, list) and len(r) == 2
assert r[0] == {'product': 'lamp', 'quantity': 2, 'price': 12.5}
```

## sales-report: stage:sales-read:prompt <!-- fp:19a9937cd5e1 -->

> The quantity is a plain `int`, the price a plain `float` (convert with `int()` and `float()`).

- file: w3/a/boss/boss.md
- why it is here: the two families name different backing (deepseek claim, claude not-a-fact)
- deepseek: true, claim. Python's int() returns a built-in int and float() returns a built-in float, so converting CSV text this way gives plain int and float values.
- claude: true, not-a-fact. It specifies the types the exercise wants returned.
- proposed assert:

```python
quantity = int("2")
price = float("12.5")
assert type(quantity) is int
assert type(price) is float
assert quantity == 2
assert price == 12.5
```

## sales-report: stage:sales-report-file:prompt <!-- fp:0382b5125a5d -->

> `json.dump` refuses NumPy whole numbers (like `numpy.int64`) and NumPy `True`/`False`, so turn every number into a plain `int` or `float`.

- file: w3/a/boss/boss.md
- why it is here: boss text has no claim blocks: move the fact into a lesson or mark it by hand
- deepseek: true, claim. json's default encoder does not recognize NumPy integer or boolean scalars, so json.dump raises TypeError for np.int64 and np.bool_; converting them to plain int/bool works.
- claude: true, claim. The json encoder raises TypeError for numpy.int64 and numpy.bool_. Plain int/float conversion fixes it.
- proposed assert:

```python
import json, io
import numpy as np
for v in (np.int64(3), np.bool_(True)):
    try:
        json.dump({'a': v}, io.StringIO())
    except TypeError:
        pass
    else:
        assert False
json.dump({'a': int(np.int64(3)), 'b': bool(np.bool_(True))}, io.StringIO())
```

## data-summary: stage:summary-clean:prompt <!-- fp:002ff8ffcde1 -->

> Skip a row whose speed is blank or not a number (`float()` raises `ValueError` then), and when an hour comes twice, keep only its first usable reading.

- file: w3/b/boss/boss.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. The sentence gives requirements for the clean(rows) exercise, not a general fact about Python. Its parenthetical about float() is correct for blank or non-numeric strings, which raise ValueError.
- claude: true, claim. float() raises ValueError for a blank string and for words. The rest is the exercise's instruction.
- proposed assert:

```python
for s in ('', ' ', 'gust'):
    try:
        float(s)
    except ValueError:
        pass
    else:
        assert False
```

## data-summary: stage:summary-numbers:prompt <!-- fp:7901bf211af8 -->

> Return plain numbers (`float()`), not NumPy ones.

- file: w3/b/boss/boss.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. It is an instruction to return Python float values rather than NumPy scalar types, not a factual claim about Python behavior.
- claude: true, advice. An instruction to return plain Python numbers, not NumPy ones.

## data-summary: stage:summary-gusts:prompt <!-- fp:56376a9fa106 -->

> `bisect.bisect_right` is like `bisect_left`, but gives the place just after any values equal to `limit`.

- file: w3/b/boss/boss.md
- why it is here: boss text has no claim blocks: move the fact into a lesson or mark it by hand
- deepseek: true, claim. `bisect_right` returns the insertion index after all values equal to the search value, while `bisect_left` returns the index before them.
- claude: true, claim. bisect_right returns the insertion point after any equal values, while bisect_left returns the point before them.
- proposed assert:

```python
import bisect
a = [1, 2, 2, 3]
assert bisect.bisect_left(a, 2) == 1
assert bisect.bisect_right(a, 2) == 3
```

## star-classifier: stage:stars-scale:prompt <!-- fp:d1d266b3a4d8 -->

> Temperatures in the thousands must not swamp brightness.

- file: w3/c/boss/boss.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude advice)
- deepseek: true, not-a-fact. It is a rationale for scaling columns, not a checkable statement about Python behavior.
- claude: true, advice. It explains why scaling matters: unscaled large features dominate distance calculations.

## star-classifier: stage:stars-vote:prompt <!-- fp:3a999b73c0cd -->

> If `k` is bigger than the number of known stars, raise your own `ValueError` with a message that mentions the stars (scikit-learn's error does not).

- file: w3/c/boss/boss.md
- why it is here: the two families name different backing (deepseek not-a-fact, claude claim)
- deepseek: true, not-a-fact. This is an instruction for the exercise's error handling, not a factual claim about Python. Its parenthetical is accurate for scikit-learn's standard n_neighbors error.
- claude: true, claim. scikit-learn raises a ValueError when n_neighbors exceeds the number of samples, but its message talks about samples and never mentions stars.
- proposed assert:

```python
from sklearn.neighbors import KNeighborsClassifier
m = KNeighborsClassifier(n_neighbors=5).fit([[0], [1], [2]], ['a', 'b', 'a'])
try:
    m.predict([[0.5]])
except ValueError as e:
    assert 'star' not in str(e).lower()
else:
    assert False
```

## star-classifier: stage:stars-accuracy:prompt <!-- fp:98c762b8c10f -->

> It must reach 0.8 (on this split, giving every star the same label scores 0.5 at best, and skipping the scaling scores 0.4).

- file: w3/c/boss/boss.md
- why it is here: verdicts differ or doubt it (deepseek true, claude unsure)
- deepseek: true, not-a-fact. This is an exercise target with dataset-specific baseline scores, not a general claim about Python or a library. The scores depend on the hidden data and split, so the sentence is an exercise description rather than a checkable Python fact.
- claude: unsure, not-a-fact. The 0.8 target is an exercise requirement. The 0.5 and 0.4 baselines depend on the course's hidden dataset and split, so they cannot be checked here.

## Hidden cases refuse an equal number of another type

The hidden cases compare exactly, so a correct answer that returns an equal number of another type (`5` for `5.0`) is refused. Whether the comparison should forgive this is the owner's call, so no answer was changed to fit it.

- generators-average: a learner who writes `return statistics.mean(numbers)` is right, but `average([1])` returns `1` and the hidden case expects `1.0`, so the exact comparison refuses it. The right answer that showed this (`right/uses-statistics.py`) was removed from the item, because no lesson teaches `statistics` yet and the vocabulary check flags it (`unknown-feature`). Nothing was changed to fit the comparison; the item has a plain `sum` and `/` right answer instead.
- Other right answers changed only to match a type comparison: none.
