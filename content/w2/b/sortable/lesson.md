+++
id = "sortable"
title = "Sortable objects"
world = "w2"
region = "b"
order = 7
concepts = ["sortable"]
remember = ["sorted, max and min need to compare: give them a key, or a __lt__.", "key=f sorts by what f returns for each item.", "__lt__(self, other) answers: is self less than other?", "reverse=True puts the biggest first."]
[loot]
id = "ranked-feathers"
name = "Ranked Feathers"
+++

`sorted`, `max` (the biggest item) and `min` (the smallest) all work by comparing items: `sorted` and `min` ask `<`, `max` asks `>`. Numbers and strings know how. Your own objects do not, until you tell Python.

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

```python claim
words = ["kiwi", "fig", "plum"]
assert sorted(words, key=len, reverse=True) == ["kiwi", "plum", "fig"]
```

```python predict
words = ["fig", "kiwi", "plum"]
print(sorted(words, key=len, reverse=True))
```

::task rank

The second way is the dunder `__lt__` ("less than"). With it, `sorted`, `max` and `min` work on your objects directly: when `max` asks whether `a > b`, Python turns the question around and asks `b < a`.

```python claim
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
