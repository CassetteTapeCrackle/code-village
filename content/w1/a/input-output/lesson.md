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

```python claim id=auto-bf632243b492
import io, contextlib
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    print('a', end='')
    print('b')
assert buf.getvalue() == 'ab\n'
```

```python claim id=auto-3bfb3839674d
import io, contextlib
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    print('a', 1, True)
assert buf.getvalue() == 'a 1 True\n'
```

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

```python claim id=auto-0aca87b189b2
score = 3.14159
assert f'{score:.1f}' == '3.1'
assert f'{2:.1f}' == '2.0'
```

```python claim id=auto-86e99e04de7c
x = 3
assert f'v={x + 1}' == 'v=4'
assert f'{len("ab")}' == '2'
```

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

```python claim id=auto-8078f7db949d
assert int('7') == 7
```

```python claim id=auto-dd12793cedb5
import io, contextlib
name, score = 'Ann', 3.14159
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    print(f"{name}: {score:.1f}")
assert buf.getvalue() == 'Ann: 3.1\n'
assert f'{score:.2f}' == '3.14'
```

```python claim id=auto-b5bfabe48513
import io, contextlib
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    print('a', 'b')
    print('c', end='')
assert buf.getvalue() == 'a b\nc'
```

```python claim id=auto-c6ba7f566d2c
x = 2.5
assert f'{x}' == '2.5'
assert f'{x:.2f}' == '2.50'
```
