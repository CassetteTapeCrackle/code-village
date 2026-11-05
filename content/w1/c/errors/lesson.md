+++
id = "errors"
title = "Errors and debugging"
world = "w1"
region = "c"
order = 11
concepts = ["errors"]
teaches = ["exception-index-error", "exception-type-error", "exception-value-error", "exception-zero-division", "raise-statement", "try-except"]
remember = ["Read a traceback from the bottom: the error's name and message, then the line it came from.", "try / except SomeError handles that one kind of error; a bare except: hides your bugs too.", "raise ValueError(\"message\") signals a problem yourself."]
[loot]
id = "magnifying-glass"
name = "Magnifying Glass"
+++

When something goes wrong, Python raises an **exception** and prints a traceback. Read it from the bottom: the last line names the error and says what happened, and the lines above show where.

The usual suspects: `NameError` (a name that does not exist), `TypeError` (the wrong type, like `"3" + 4`), `ValueError` (the right type but a bad value, like `int("abc")`), `IndexError` and `KeyError`.

```python claim id=errors-claim-1
def error_from(make):
    try:
        make()
    except Exception as error:
        return type(error)
    return None

assert error_from(lambda: undefined_name) is NameError
assert error_from(lambda: "3" + 4) is TypeError
assert error_from(lambda: int("abc")) is ValueError
assert error_from(lambda: [1][5]) is IndexError
assert error_from(lambda: {}["key"]) is KeyError
```

`try` runs code that might fail, and `except SomeError` handles that kind of error only.

```python claim id=auto-8f9ad33b3734
try:
    try:
        int('abc')
    except TypeError:
        handled = True
except ValueError:
    handled = False
assert handled is False
try:
    1 / 0
except ZeroDivisionError:
    handled = True
assert handled
```

```python example
def to_number(text):
    try:
        return int(text)
    except ValueError:
        return None

print(to_number("42"), to_number("forty"))
```

::task safe-divide

A bare `except:` catches **everything**, even a typo in a variable name. The bug disappears and the function quietly gives the wrong answer. Catch the error you expect, and let the rest show up.

```python claim id=auto-5bd91c7fcbe5
def f():
    value = 1
    try:
        return valeu
    except:
        return None
assert f() is None
```

```python predict
def parse(text):
    try:
        return int(txt)
    except:
        return 0

print(parse("5"))
```

::task parse-age

`raise` signals a problem yourself, with a message for whoever reads the traceback.

```python example
def check_age(age):
    if age < 0:
        raise ValueError("age cannot be negative")
    return age

try:
    check_age(-3)
except ValueError as e:
    print(e)
```

::task withdraw

```python claim id=auto-2daf6b471ed9
try:
    1 / 0
except ZeroDivisionError:
    ok = True
assert ok
try:
    1 // 0
except ZeroDivisionError:
    ok = True
assert ok
```

```python claim id=auto-14b37d801a5d
try:
    raise ValueError("message")
except ValueError as e:
    assert e.args == ("message",)
```
