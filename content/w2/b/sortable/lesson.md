+++
id = "sortable"
title = "Sortable objects"
world = "w2"
region = "b"
order = 7
concepts = ["sortable"]
teaches = ["fn-min-max", "sorted-reverse"]
remember = ["sorted, max and min need to compare: give them a key, or a __lt__.", "key=f sorts by what f returns for each item.", "__lt__(self, other) answers: is self less than other?", "reverse=True puts the biggest first."]
[loot]
id = "ranked-feathers"
name = "Ranked Feathers"
+++

`sorted`, `max` (the biggest item) and `min` (the smallest) all work by comparing items: `sorted` and `min` ask `<`, `max` asks `>`. Numbers and strings know how. Your own objects do not, until you tell Python.

```python claim id=auto-3cef00ce2878
assert 1 < 2
assert 'a' < 'b'
assert sorted([3, 1, 2]) == [1, 2, 3]
assert sorted(['b', 'a']) == ['a', 'b']
assert max([1, 3, 2]) == 3 and min('bca') == 'a'
```

```python claim id=auto-b5f2f8a65bdf
calls = []
class A:
    def __init__(s, v):
        s.v = v
    def __lt__(s, o):
        calls.append('lt')
        return s.v < o.v
    def __gt__(s, o):
        calls.append('gt')
        return s.v > o.v
xs = [A(1), A(2), A(3)]
sorted(xs)
assert set(calls) == {'lt'}
calls.clear()
min(xs)
assert set(calls) == {'lt'}
calls.clear()
max(xs)
assert set(calls) == {'gt'}
```

```python claim id=auto-06e91d733902
class A:
    pass
for f in (sorted, max, min):
    try:
        f([A(), A()])
        assert False
    except TypeError:
        pass
```

```python example
class Fox:
    def __init__(self, name, age):
        self.name = name
        self.age = age

try:
    sorted([Fox("Sly", 3), Fox("Red", 1)])
except TypeError as error:
    print("TypeError:", error)
```

The first way is a **key**: a function that turns each object into something Python can compare. It is the same `key=` you met with words and `len`.

```python claim id=auto-e1ab2f169c13
class B:
    def __init__(s, n):
        s.name = n
bs = [B('b'), B('a')]
assert [b.name for b in sorted(bs, key=lambda b: b.name)] == ['a', 'b']
```

```python example
class Fox:
    def __init__(self, name, age):
        self.name = name
        self.age = age

def age_of(fox):
    return fox.age

foxes = sorted([Fox("Sly", 3), Fox("Red", 1), Fox("Tod", 2)], key=age_of)
print([f.name for f in foxes])
```

::task by-name

`reverse=True` turns any sort around. Items with the same key keep their order.

```python claim id=auto-f4379b4969e7
x = [(1, 'a'), (1, 'b'), (2, 'c')]
x.sort(key=lambda p: p[0], reverse=True)
assert x == [(2, 'c'), (1, 'a'), (1, 'b')]
assert sorted([3, 1, 2], reverse=True) == [3, 2, 1]
```

```python claim id=auto-edbba9ec7825
data = [('a', 1), ('b', 1), ('c', 0)]
assert sorted(data, key=lambda t: t[1]) == [('c', 0), ('a', 1), ('b', 1)]
assert sorted(data, key=lambda t: t[1], reverse=True) == [('a', 1), ('b', 1), ('c', 0)]
```

```python claim id=sortable-claim-1
words = ["kiwi", "fig", "plum"]
assert sorted(words, key=len, reverse=True) == ["kiwi", "plum", "fig"]
```

```python predict
words = ["fig", "kiwi", "plum"]
print(sorted(words, key=len, reverse=True))
```

::task rank

The second way is the dunder `__lt__` ("less than"). With it, `sorted`, `max` and `min` work on your objects directly: when `max` asks whether `a > b`, Python turns the question around and asks `b < a`.

```python claim id=auto-68e9129e627e
class A:
    def __init__(s, v):
        s.v = v
    def __lt__(s, o):
        return s.v < o.v
a, b = A(2), A(1)
assert (a > b) is True
assert max([b, a]) is a
assert min([a, b]) is b
assert sorted([a, b]) == [b, a]
```

```python claim id=auto-ded18a2b445e
class A:
    def __init__(s, v):
        s.v = v
    def __lt__(s, o):
        return s.v < o.v
assert [a.v for a in sorted([A(2), A(1)])] == [1, 2]
```

```python claim id=sortable-claim-2
asked = []

class Box:
    def __init__(self, n):
        self.n = n

    def __lt__(self, other):
        asked.append((self.n, other.n))
        return self.n < other.n

assert max([Box(1), Box(2)]).n == 2
assert asked == [(1, 2)]
```

```python example
class Fox:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __lt__(self, other):
        return self.age < other.age

foxes = [Fox("Sly", 3), Fox("Red", 1)]
print([f.name for f in sorted(foxes)], max(foxes).name)
```

::task acorns

```python claim id=auto-f10b2e1649f4
seen = []
def k(x):
    seen.append(x)
    return -x
assert sorted([1, 3, 2], key=k) == [3, 2, 1]
assert sorted(seen) == [1, 2, 3]
```

```python claim id=auto-3b82ec6037e1
def k(x):
    return len(x)
assert sorted(['ccc', 'a', 'bb'], key=k) == ['a', 'bb', 'ccc']
```

```python claim id=auto-02100c6e8f78
assert sorted(['bb', 'a', 'ccc'], key=len) == ['a', 'bb', 'ccc']
```

```python claim id=auto-3599c05bc5af
class A:
    def __lt__(self, other):
        return True
assert (A() < A()) is True
```

```python claim id=auto-0b1e35d7ff8e
assert sorted([1, 3, 2], reverse=True) == [3, 2, 1]
```

```python claim id=auto-7861ffd792f7
class Tree:
    def __init__(self, kind, age):
        self.kind = kind
        self.age = age

trees = [Tree('oak', 10), Tree('pine', 5)]
try:
    sorted(trees, reverse=True)
except TypeError:
    pass
else:
    raise AssertionError('expected TypeError')

assert [t.kind for t in sorted(trees, key=lambda tree: tree.age, reverse=True)] == ['oak', 'pine']
```

```python claim id=auto-ee9efdf7e192
class Obj:
    def __init__(self, weight):
        self.weight = weight
    def __lt__(self, other):
        return self.weight < other.weight

a = Obj(1)
b = Obj(2)
assert (a < b) is True
assert (b < a) is False
```

```python claim id=auto-79ffa7e12aa5
class NoOrder:
    def __init__(self, v):
        self.v = v

for func in (sorted, max, min):
    try:
        func([NoOrder(1), NoOrder(2)])
    except TypeError:
        pass
    else:
        assert False

class Less:
    def __init__(self, v):
        self.v = v
    def __lt__(self, other):
        return self.v < other.v

assert [x.v for x in sorted([Less(2), Less(1)])] == [1, 2]
assert max([Less(1), Less(2)]).v == 2
assert min([Less(1), Less(2)]).v == 1
assert [x.v for x in sorted([NoOrder(2), NoOrder(1)], key=lambda x: x.v)] == [1, 2]
assert max([NoOrder(1), NoOrder(2)], key=lambda x: x.v).v == 2
assert min([NoOrder(1), NoOrder(2)], key=lambda x: x.v).v == 1
```
