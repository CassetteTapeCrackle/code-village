+++
id = "strings"
title = "Strings"
world = "w1"
region = "b"
order = 5
concepts = ["strings"]
remember = ["Index and slice strings: s[1:4] stops before index 4. Lists (next lesson) work the same way.", "Strings never change: s.upper() returns a new string, so keep it (s = s.upper()).", "split() turns a string into a list of words; strip() removes spaces and line breaks at both ends."]
[loot]
id = "ink-pot"
name = "Ink Pot"
+++

A string is a sequence of characters. Read one by its index, counting from 0 (negative indexes count from the end), and take a **slice** with `[start:stop]`, which stops before `stop`.

```python claim
word = "village"
assert word[0] == "v" and word[-1] == "e" and word[1:4] == "ill" and len(word[1:4]) == 3
```

```python example
word = "village"
print(word[0], word[-1], word[1:4], len(word))
```

String methods give you a **new** string: `upper()`, `lower()`, `strip()` (removes spaces, tabs and line breaks at both ends), `replace(old, new)`. `split()` cuts a string into a list of words (lists are the next lesson).

```python claim
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

```python claim
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
