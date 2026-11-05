+++
id = "strings"
title = "Strings"
world = "w1"
region = "b"
order = 5
concepts = ["strings"]
teaches = ["fn-len", "slicing", "str-case", "str-replace", "str-split", "str-strip"]
remember = ["Index and slice strings: s[1:4] stops before index 4. Lists (next lesson) work the same way.", "Strings never change: s.upper() returns a new string, so keep it (s = s.upper()).", "split() turns a string into a list of words; strip() removes spaces and line breaks at both ends."]
[loot]
id = "ink-pot"
name = "Ink Pot"
+++

A string is a sequence of characters. Read one by its index, counting from 0 (negative indexes count from the end), and take a **slice** with `[start:stop]`, which stops before `stop`.

```python claim id=auto-eed3b6ccd78f
s = 'hello'
assert s[0] == 'h'
assert s[-1] == 'o'
assert s[1:3] == 'el'
```

```python claim id=auto-02d4ebb5eecb
from collections.abc import Sequence
s = 'abc'
assert isinstance(s, Sequence)
assert list(s) == ['a', 'b', 'c']
```

```python claim id=strings-claim-1
word = "village"
assert word[0] == "v" and word[-1] == "e" and word[1:4] == "ill" and len(word[1:4]) == 3
```

```python example
word = "village"
print(word[0], word[-1], word[1:4], len(word))
```

String methods give you a **new** string: `upper()`, `lower()`, `strip()` (removes spaces, tabs and line breaks at both ends), `replace(old, new)`. `split()` cuts a string into a list of words (lists are the next lesson).

```python claim id=auto-63464a76a799
s = ' \tHi there\n'
assert s.strip() == 'Hi there'
assert s.upper() == ' \tHI THERE\n'
assert s.lower() == ' \thi there\n'
assert s.replace('Hi', 'Yo') == ' \tYo there\n'
assert s == ' \tHi there\n'
```

```python claim id=strings-claim-2
assert " \t fern\n ".strip() == "fern"
assert "a  b\tc".split() == ["a", "b", "c"] and "a, b".split(", ") == ["a", "b"]
```

```python example
line = "  Noa, Ines, Sam  "
print(line.strip().split(", "))
print("tea".replace("t", "s").upper())
```

::task initials

A string never changes in place. A method returns a new string and leaves the old one as it was, so keep the result in a variable.

```python claim id=auto-79cd2ea70f4e
s = 'abc'
s.upper()
assert s == 'abc'
try:
    s[0] = 'x'
    ok = False
except TypeError:
    ok = True
assert ok
```

```python claim id=strings-claim-3
name = "mika"
loud = name.upper()
assert name == "mika" and loud == "MIKA"
```

```python predict
name = "mika"
name.upper()
print(name)
```

::task shout

::task clean-tag

```python claim id=auto-8868e22603fe
full_name = 'ada king lovelace'
assert full_name.split() == ['ada', 'king', 'lovelace']
word = full_name.split()[1]
assert word[0] == 'k'
```

```python claim id=auto-074e3c6d6df5
text = 'hey'
result = text.upper()
result = result + '!'
assert result == 'HEY!'
assert text == 'hey'
```

```python claim id=auto-da118da9c987
assert ' Python Village '.strip().lower().replace(' ', '-') == 'python-village'
```

```python claim id=auto-2f61dd98a21d
s = 'A B A'
assert s.lower() == 'a b a'
assert s.replace('A', 'x') == 'x B x'
assert s == 'A B A'
```

```python claim id=auto-3f23b8671636
s = 'abcdef'
assert s[1:4] == 'bcd'
```

```python claim id=auto-ae0626a9008e
x = [10, 20, 30, 40, 50]
assert x[1:4] == [20, 30, 40]
assert x[0] == 10
assert x[-1] == 50
```

```python claim id=auto-304cf0a1cae2
s = 'abc'
s.upper()
assert s == 'abc'
s = s.upper()
assert s == 'ABC'
```
