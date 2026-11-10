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

::task hello
