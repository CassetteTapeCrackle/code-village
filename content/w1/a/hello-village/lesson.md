+++
id = "hello-village"
title = "Hello, Code Village"
world = "w1"
region = "a"
order = 0
tour = true
concepts = ["io"]
teaches = ["fn-print"]
remember = ["`print()` shows text on the screen.", "The text goes between the quotes."]
[loot]
id = "welcome-bell"
name = "Welcome Bell"
+++

Ms. Juniper waves you in. "`print()` shows text on the screen," she says. "The text goes between the quotes."

```python claim id=auto-3cdd45525dd7
import contextlib, io
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    print("hello")
assert buf.getvalue() == "hello\n"
```

```python example
print("Hello NAME!")
```

```python claim id=remember-74ab721dbb60
import contextlib
import io

shown = io.StringIO()
with contextlib.redirect_stdout(shown):
    print("Hello, village!")
assert shown.getvalue() == "Hello, village!\n"
```

```python claim id=remember-da54a5945186
import contextlib
import io

shown = io.StringIO()
with contextlib.redirect_stdout(shown):
    print("Hi there")
assert shown.getvalue() == "Hi there\n"  # the quotes mark the text and are not shown
try:
    compile("print(Hi there)", "<test>", "exec")
    raised = False
except SyntaxError:
    raised = True
assert raised
```

::task hello
