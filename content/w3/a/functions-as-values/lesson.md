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

```python example
def shout(text):
    return text.upper() + "!"

speak = shout
print(speak("hi"))
for f in [len, shout]:
    print(f("owl"))
```

`speak = shout` has no brackets: it does not call `shout`, it gives the same function a second name. The loop then calls each function in the list on `"owl"`.

```python claim
def shout(text):
    return text.upper() + "!"

speak = shout
assert speak is shout and speak("hi") == "HI!"
```

::task twice

For a tiny function you only need once, write a **lambda**: `lambda n: n * 2` takes `n` and returns `n * 2`. It fits right where a function is expected, like the `key=` of `sorted`.

```python claim
assert (lambda n: n * 2)(4) == 8
```

```python example
words = ["kiwi", "fig", "banana"]
print(sorted(words, key=lambda w: w[-1]))
```

`map` and `filter` take a function and a list. `map` applies the function to every item; `filter` keeps the items for which it gives `True`. They hand back their results one at a time, so wrap them in `list()` to see them all.

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

```python predict
def loud(word):
    return word.upper()

print(list(map(loud, ["owl", "elk"])))
```

`map(loud(), ...)` would fail before `map` even starts: `loud()` is a call, missing its `word`.

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
