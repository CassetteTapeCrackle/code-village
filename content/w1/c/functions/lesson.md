+++
id = "functions"
title = "Functions"
world = "w1"
region = "c"
order = 10
concepts = ["functions"]
remember = ["return hands a value back; print only shows it, and the caller gets None.", "A default fills in a missing argument: def greet(name, greeting=\"Hello\").", "Never use a list as a default: use None and make the list inside the function.", "sorted(items, key=len) sorts by what the key function returns."]
[loot]
id = "recipe-card"
name = "Recipe Card"
+++

`def` makes a **function**: a named block you call with **arguments**. `return` hands a value back to the caller. `print` only shows a value on screen, and a function without `return` gives back `None`.

```python claim
def show(n):
    print(n)

assert show(4) is None
```

```python example
def double(n):
    return n * 2

def show_double(n):
    print(n * 2)

x = double(4)
y = show_double(4)
print(x, y)
```

A parameter can have a **default**, used when the caller leaves it out. Names created inside a function are **local**: they disappear when it returns.

::task greeting

`sorted(items, key=f)` sorts by what `f` returns for each item, so `key=len` sorts by length. Items with the same key keep their order.

```python claim
assert sorted(["kiwi", "plum", "fig"], key=len) == ["fig", "kiwi", "plum"]

def greet(name, greeting="Hello"):
    inner = f"{greeting} {name}"
    return inner

assert greet("Noa") == "Hello Noa" and greet("Noa", "Hi") == "Hi Noa"
assert "inner" not in globals()
```

```python example
words = ["fig", "banana", "kiwi"]
print(sorted(words), sorted(words, key=len))
```

::task by-length

A default value is made **once**, when Python reads the `def`, not at each call. A list used as a default is shared by every call that leaves it out.

```python predict
def add(item, bag=[]):
    bag.append(item)
    return bag

add("tea")
print(add("jam"))
```

::task add-item
