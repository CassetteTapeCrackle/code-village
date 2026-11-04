+++
id = "functions-as-values"
title = "Functions as values"
world = "w3"
region = "a"
order = 1
concepts = ["functions-as-values"]
remember = ["A function is a value: store it in a name, put it in a list, pass it to another function.", "lambda n: n * 2 is a small function with no name, written right where it is used.", "map(f, items) applies f to every item; filter(f, items) keeps the items where f gives True. Wrap them in list() to see the results.", "Pass a function by its name, without brackets: key=by_price, not key=by_price(items)."]
[loot]
id = "brass-pointer"
name = "Brass Pointer"
+++

A function is a value, like a number or a string. You can store it under another name, keep it in a list, and pass it to another function, which calls it later.

```python claim id=auto-6a3afaa4d608
def f(x):
    return x + 1
g = f
fs = [f, g]
def run(fn, v):
    return fn(v)
assert fs[0](1) == 2
assert run(f, 1) == 2
```

```python claim id=auto-f60783745113
def f():
    return 1
g = f
assert type(f).__name__ == 'function'
assert g is f
```

```python example
def shout(text):
    return text.upper() + "!"

speak = shout
print(speak("hi"))
for f in [len, shout]:
    print(f("owl"))
```

`speak = shout` has no brackets: it does not call `shout`, it gives the same function a second name. The loop then calls each function in the list on `"owl"`.

```python claim id=auto-ec15ff90ab93
def shout(w):
    return w.upper()
speak = shout
assert speak is shout
assert speak('a') == 'A'
```

```python claim
def shout(text):
    return text.upper() + "!"

speak = shout
assert speak is shout and speak("hi") == "HI!"
```

::task twice

For a tiny function you only need once, write a **lambda**: `lambda n: n * 2` takes `n` and returns `n * 2`. It fits right where a function is expected, like the `key=` of `sorted`.

```python claim id=auto-7b6ea40c072c
assert sorted([3, 1, 2], key=lambda n: -n) == [3, 2, 1]
```

```python claim id=auto-8ceaddc451ee
f = lambda n: n * 2
assert f(4) == 8
```

```python claim
assert (lambda n: n * 2)(4) == 8
```

```python example
words = ["kiwi", "fig", "banana"]
print(sorted(words, key=lambda w: w[-1]))
```

`map` and `filter` take a function and a list. `map` applies the function to every item; `filter` keeps the items for which it gives `True`. They hand back their results one at a time, so wrap them in `list()` to see them all.

```python claim id=auto-19fe2f121661
m = map(str, [1, 2])
f = filter(None, [0, 1])
assert not isinstance(m, list) and not isinstance(f, list)
assert next(m) == '1'
assert list(m) == ['2']
assert list(f) == [1]
```

```python claim
m = map(lambda n: n * 10, [3, 8])
assert not isinstance(m, list)
assert next(m) == 30 and list(m) == [80]
```

```python predict
nums = [3, 8, 1, 6]
print(list(map(lambda n: n * 10, nums)))
print(list(filter(lambda n: n > 4, nums)))
```

::task keep-long

To pass a function, write its name **without brackets**. With brackets you call it on the spot and pass whatever it returns, which is usually not a function at all.

```python claim id=auto-f28b2527341c
def f(x):
    return x + 1
assert list(map(f, [1, 2])) == [2, 3]
```

```python predict
def loud(word):
    return word.upper()

print(list(map(loud, ["owl", "elk"])))
```

`map(loud(), ...)` would fail before `map` even starts: `loud()` is a call, missing its `word`.

```python claim id=auto-128ddf5b1c30
def loud(word):
    return word.upper()
try:
    map(loud(), ['a'])
except TypeError as e:
    assert 'word' in str(e)
else:
    assert False
```

```python claim
def loud(word):
    return word.upper()

try:
    map(loud(), ["owl"])
    raised = None
except TypeError as error:
    raised = error
assert raised is not None and "word" in str(raised)
```

::task cheapest

```python claim id=auto-2d40c429dc4a
def add_one(n):
    return n + 1
def apply_twice(f, x):
    return f(f(x))
assert apply_twice(add_one, 5) == 7
```

```python claim id=auto-e1477b47c491
def compose(f, g, x):
    return f(g(x))
assert compose(str, len, 'moss') == '4'
```

```python claim id=auto-da9850a4ccfe
words = ['ant', 'bee', 'ape']
assert list(filter(lambda w: w.startswith('a'), words)) == ['ant', 'ape']
```

```python claim id=auto-207cdde5f7da
def f(x):
    return x
g = f
lst = [f]
def call(fn):
    return fn(1)
assert g is f and lst[0] is f and call(f) == 1
```
