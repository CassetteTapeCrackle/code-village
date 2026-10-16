+++
id = "input-output"
title = "Input, output and f-strings"
world = "w1"
region = "a"
order = 2
concepts = ["io"]
remember = ["print() separates values with spaces; end=\"\" stops the new line.", "input() always returns a str, even when the user types digits.", "f\"{x}\" puts a value inside text; {x:.2f} shows 2 decimals."]
[loot]
id = "tin-whistle"
name = "Tin Whistle"
+++

`print()` shows values on screen, separated by spaces, and ends the line. Give it `end=""` to stay on the same line.

```python claim
import contextlib
import io

shown = io.StringIO()
with contextlib.redirect_stdout(shown):
    print("Hello", "Noa", 3)
    print("no new line", end="")
    print("!")
assert shown.getvalue() == "Hello Noa 3\nno new line!\n"
```

```python example
print("Hello", "Noa", 3)
print("no new line", end="")
print("!")
```

`input()` waits for the user to type a line and gives it back. It **always** gives back a `str`, even when the user types digits.

```python predict
age = "12"
print(age + "1")
```

In the tasks below your code is a whole program: it reads with `input()`, and the checks type the answers for you. Call `input()` with nothing inside the brackets: a question would be printed too, and the check would not match.

::task greet

An **f-string** puts values inside text: write `f` before the quote, and put any expression in braces. `{score:.1f}` shows one decimal.

```python claim
score = 17.456
assert f"{score:.1f}" == "17.5" and f"{score:.2f}" == "17.46" and f"{3 + 4}" == "7"
```

```python example
name = "Ines"
score = 17.456
print(f"{name} scored {score:.1f} points")
```

::task next-year

::task receipt
