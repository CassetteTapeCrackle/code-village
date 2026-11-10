+++
id = "files-json"
title = "Files, with and JSON"
world = "w3"
region = "a"
order = 3
concepts = ["files-json"]
teaches = ["file-read", "file-write", "fn-open", "json-module", "with-statement"]
remember = ["with open(path) as f: closes the file for you when the block ends, even after an error.", "\"r\" reads (the default), \"w\" writes a fresh file, \"a\" adds to the end of it.", "json.dump(data, f) saves lists, dicts, numbers, strings, True, False and None; json.load(f) reads them back.", "Opening with \"w\" empties the file first: use \"a\" to keep what is already there."]
[loot]
id = "field-logbook"
name = "Field Logbook"
+++

Data that should outlive your program goes in a **file**. `open(path, "w")` opens one for writing, and `with` closes it for you when the block ends, so nothing is lost even if an error happens halfway.

```python claim id=files-json-claim-1
with open("notes.txt", "w") as f:
    pass

try:
    with open("notes.txt", "w") as f:
        f.write("fern\n")
        raise ValueError("halfway")
    raised = False
except ValueError:
    raised = True
assert raised

with open("notes.txt") as g:
    assert f.closed and g.read() == "fern\n"
```

```python example
with open("notes.txt", "w") as f:
    f.write("fern\n")
    f.write("moss\n")

with open("notes.txt") as f:
    for line in f:
        print(line.strip())
```

`write` adds no line break on its own, so each line ends with `"\n"`. Reading a file line by line gives each line with its `"\n"`, which `strip()` removes. (Every run here starts in an empty folder, so the files you make are yours alone.)

```python claim id=auto-dd1088d78628
import io
s = io.StringIO()
s.write('a')
s.write('b')
assert s.getvalue() == 'ab'
s.write('c\n')
assert s.getvalue() == 'abc\n'
```

```python claim id=files-json-claim-2
with open("notes.txt", "w") as f:
    f.write("fern")
    f.write("moss\n")
with open("notes.txt") as f:
    lines = list(f)
assert lines == ["fernmoss\n"] and lines[0].strip() == "fernmoss"
```

::task save

Text files hold text. To save lists and dicts and get them back as lists and dicts, use **JSON**, a text format nearly every language reads. `json.dump` writes a value to a file; `json.load` reads it back.

```python claim id=auto-941827b953e0
import io, json
f = io.StringIO()
json.dump({'a': [1, 2]}, f)
f.seek(0)
assert json.load(f) == {'a': [1, 2]}
```

```python example
import json

camp = {"name": "Ridge", "tents": 3, "open": True}
with open("camp.json", "w") as f:
    json.dump(camp, f)

with open("camp.json") as f:
    back = json.load(f)
print(back["tents"], back == camp)
print(json.dumps([1, "two", None]))
```

`json.dumps` (with an s, for string) gives the JSON text itself: `None` is written `null`, and strings always take double quotes. JSON also keeps less than Python: dict keys always come back as strings, and tuples come back as lists.

```python claim id=auto-fe3aabe899c9
import json
assert json.loads(json.dumps({1: 'a'})) == {'1': 'a'}
assert json.loads(json.dumps((1, 2))) == [1, 2]
```

```python claim id=auto-ed762920286b
import json
assert json.dumps(None) == 'null'
assert json.dumps('hi') == '"hi"'
assert json.dumps("it's") == '"it\'s"'
assert isinstance(json.dumps([1]), str)
```

```python claim id=files-json-claim-3
import json

assert json.dumps([None, "hi", True]) == '[null, "hi", true]'
assert json.loads(json.dumps({1: (2, 3)})) == {"1": [2, 3]}
```

::task best

The mode decides what happens to what is already in the file. `"w"` starts a fresh file every time, even when one is there; `"a"` (append) keeps it and writes at the end.

```python claim id=files-json-claim-4
with open("log.txt", "w") as f:
    f.write("day 1\n")
with open("log.txt", "a") as f:
    f.write("day 2\n")
with open("log.txt") as f:
    assert f.read() == "day 1\nday 2\n"
```

```python predict
with open("log.txt", "w") as f:
    f.write("day 1\n")
with open("log.txt", "w") as f:
    f.write("day 2\n")
with open("log.txt") as f:
    print(f.read().strip())
```

::task logbook

```python claim id=auto-94b0b6847475
import io
s = io.StringIO()
try:
    s.write('a', '\n')
except TypeError:
    pass
else:
    raise SystemExit('accepted two args')
s.write('a' + '\n')
assert s.getvalue() == 'a\n'
```

```python claim id=auto-ab43f86c57f6
import io, json
assert json.load(io.StringIO('[1, 2]')) == [1, 2]
assert json.loads('[1, 2]') == [1, 2]
```

```python claim id=auto-fb6dbce2f4d6
import os
try:
    with open(os.devnull) as f:
        raise ValueError
except ValueError:
    pass
assert f.closed
```

```python claim id=auto-52b08215b5c1
import json, io
data = [1, 2.5, 'a', True, False, None, {'k': [1]}]
f = io.StringIO()
json.dump(data, f)
f.seek(0)
assert json.load(f) == data
```
