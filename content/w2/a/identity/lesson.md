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

```python claim id=auto-e2dd777e1b0d
a = [1]
b = [1]
c = a
assert c is a
assert not (b is a)
```

```python claim id=auto-bbf40e5a57da
a = [1, 2]
b = [1, 2]
assert a == b
assert a is not b
```

```python example
a = [1, 2]
b = [1, 2]
c = a
print(a == b, a is b, a is c)
```

`a` and `b` hold equal lists, but they are two separate lists. `c = a` makes no copy: it is a second name for the same list. `is not` asks the opposite: "a different object?".

```python claim id=auto-bf97c39212ba
a = [1]
b = [1]
c = a
assert (a is not b) is True
assert (a is not c) is False
```

```python claim id=auto-5f6deba07ea0
a = [1, 2]
c = a
assert c is a
c.append(3)
assert a == [1, 2, 3]
```

```python claim id=auto-4e84ba978aa3
a = [1, 2, 3]
b = [1, 2, 3]
assert a == b
assert a is not b
```

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

```python claim id=auto-bb5e6b3108d6
class Fox:
    pass
assert isinstance(Fox(), Fox) is True
assert isinstance(3, Fox) is False
```

```python claim id=auto-a2535e1d6da2
class A:
    pass
x = A()
y = A()
assert x == x
assert x != y
```

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

```python claim id=auto-ce28001d7582
a = [1]
b = [1]
bags = [a, b]
bags.remove(b)
assert len(bags) == 1
assert bags[0] is b
assert bags[0] is not a
```

```python claim id=auto-21e325ac7426
class A:
    def __init__(self, v):
        self.v = v
    def __eq__(self, o):
        return self.v == o.v
x = [A(1), A(2)]
assert x.index(A(2)) == 1
assert x.count(A(1)) == 1
x.remove(A(2))
assert len(x) == 1
```

```python claim
a, b = ["tent"], ["tent"]
bags = [a, b]
bags.remove(b)
assert len(bags) == 1 and bags[0] is b
```

::task without-exact

```python claim id=auto-619bc09de2ae
f = ['a', 'b']
g = f.copy()
assert g == f and g is not f
```

```python claim id=auto-9636cc75a82e
a = [1]
b = [1]
bags = [a, b]
bags.remove(b)
assert bags[0] is b
```

```python claim id=auto-cff90d44a04c
a = {'t': 1}
b = {'t': 1}
assert a == b
assert a is not b
assert not (a is not a)
```

```python claim id=auto-7527abbbf463
a = [1]
b = [1]
c = a
assert a is c
assert a is not b
```

```python claim id=auto-5d8027403670
class Fox:
    def __init__(self, n):
        self.n = n
a = Fox(1)
b = Fox(1)
assert a != b
assert a == a
class Fox2(Fox):
    def __eq__(self, o):
        return self.n == o.n
assert Fox2(1) == Fox2(1)
```

```python claim id=auto-f77235d305e6
class Fox:
    pass
class Dog:
    pass
assert isinstance(Fox(), Fox)
assert not isinstance(Dog(), Fox)
```
