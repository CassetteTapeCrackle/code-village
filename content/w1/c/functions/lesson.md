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

```python claim id=auto-66b22e10d786
def f():
    return 5
x = f()
assert x == 5
```

```python claim id=auto-7e98bf6f6c00
def f(a):
    return a
assert callable(f) and f.__name__ == 'f' and f(1) == 1
```

```python claim id=functions-claim-1
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

```python claim id=auto-3eeac6338d93
def f(a, b=3):
    return a + b
assert f(1) == 4
assert f(1, 2) == 3
```

::task greeting

`sorted(items, key=f)` sorts by what `f` returns for each item, so `key=len` sorts by length. Items with the same key keep their order.

```python claim id=auto-edbba9ec7825
data = [('a', 1), ('b', 1), ('c', 0)]
assert sorted(data, key=lambda t: t[1]) == [('c', 0), ('a', 1), ('b', 1)]
assert sorted(data, key=lambda t: t[1], reverse=True) == [('a', 1), ('b', 1), ('c', 0)]
```

```python claim id=auto-e72fb8f75550
assert sorted(['ccc', 'a', 'bb'], key=len) == ['a', 'bb', 'ccc']
```

```python claim id=functions-claim-2
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

```python claim id=auto-1ca86c55da70
def f(x=[]):
    x.append(1)
    return x
a = f()
b = f()
assert a is b and b == [1, 1]
```

```python claim id=auto-c07bd6982747
count = 0
def make():
    global count
    count += 1
    return count
def f(x=make()):
    return x
f(); f()
assert count == 1
```

```python predict
def add(item, bag=[]):
    bag.append(item)
    return bag

add("tea")
print(add("jam"))
```

::task add-item

```python claim id=auto-019b35c1197b
assert sorted([3, 1, 2], key=lambda x: -x) == [3, 2, 1]
```

```python claim id=auto-05ba52c96ac3
assert sorted(['bb', 'a'], key=len) == ['a', 'bb']
```

```python claim id=auto-f6016cd33b73
def a():
    return 1
def b():
    print('x')
assert a() == 1
assert b() is None
```

```python claim id=auto-eedba768e748
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}"
assert greet("Noa") == "Hello, Noa"
assert greet("Noa", "Hi") == "Hi, Noa"
```

```python claim id=auto-1b0b8077bd55
items = ['ccc', 'a', 'bb']
assert sorted(items, key=len) == ['a', 'bb', 'ccc']
```
