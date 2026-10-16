+++
id = "identity"
title = "Identity and equality"
world = "w2"
region = "a"
order = 3
concepts = ["identity"]
remember = ["== asks: same value? is asks: the very same object?", "b = a gives a second name for the same object: change one, you change both.", "Your own objects are == only when they are the same object, until you write __eq__.", "isinstance(x, Fox) asks whether x is a Fox."]
[loot]
id = "twin-pinecones"
name = "Twin Pinecones"
+++

Two questions look alike but are not. `==` asks whether two values are **equal**. `is` asks whether two names point at **the very same object**.

```python example
a = [1, 2]
b = [1, 2]
c = a
print(a == b, a is b, a is c)
```

`a` and `b` hold equal lists, but they are two separate lists. `c = a` makes no copy: it is a second name for the same list. `is not` asks the opposite: "a different object?".

```python claim
a = [1, 2]
c = a
c.append(3)
assert a == [1, 2, 3] and a is c
```

```python predict
a = [1, 2]
b = a
c = [1, 2]
b.append(3)
print(a, a == c, a is b)
```

::task trails

Objects of your own class compare with `==` by identity, until you teach them otherwise (a later lesson). `isinstance(a, Fox)` asks whether `a` is a `Fox`.

```python claim
class Fox:
    def __init__(self, name):
        self.name = name

a, b = Fox("Sly"), Fox("Sly")
assert a != b and a == a
assert isinstance(a, Fox) and not isinstance("Sly", Fox)
```

```python example
class Fox:
    def __init__(self, name):
        self.name = name

a = Fox("Sly")
b = Fox("Sly")
c = a
print(a == b, a is c, isinstance(a, Fox), isinstance("Sly", Fox))
```

::task copy-hiker

Some list methods compare with `==`. `remove(x)` deletes the first item **equal** to `x`, which is not always the object you meant.

```python claim
a, b = ["tent"], ["tent"]
bags = [a, b]
bags.remove(b)
assert len(bags) == 1 and bags[0] is b
```

::task without-exact
