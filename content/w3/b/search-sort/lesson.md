+++
id = "search-sort"
title = "Searching fast"
world = "w3"
region = "b"
order = 7
concepts = ["search-sort"]
teaches = ["bisect-module"]
remember = ["A linear search looks at every item in turn: fine for short lists, slow for long ones.", "A binary search halves a sorted list at each step: about 20 steps for a million items.", "bisect.bisect_left(sorted_list, x) gives where x is, or where it would go; bisect.insort adds x and keeps the list sorted.", "A binary search only works on sorted data: on an unsorted list it skips the part where the value is. Sort first."]
[loot]
id = "sorting-sieve"
name = "Sorting Sieve"
+++

To find a value in a list, the simplest way is to look at every item in turn until it turns up. This is a **linear search**.

```python example
def find(items, target):
    for i, x in enumerate(items):
        if x == target:
            return i
    return -1

print(find([7, 3, 9], 9), find([7, 3, 9], 4))
```

With a million items, a linear search may look at all million of them.

```python claim id=auto-a5fad790badc
items = list(range(1000000))
count = 0
for x in items:
    count += 1
    if x == -1:
        break
assert count == 1000000
```

::task find-all

When the list is **sorted**, there is a much faster way, like finding a word in a dictionary. Look at the middle item: if it is too small, the target can only be in the right half, so throw the left half away, and repeat. This is a **binary search**. Each step halves what is left, so a million items take about 20 steps.

```python claim id=auto-77af3bdbf8e5
def steps_to_find(items, target):
    low, high, steps = 0, len(items), 0
    while low < high:  # each step keeps one half of what is left
        steps += 1
        middle = (low + high) // 2
        if items[middle] < target:
            low = middle + 1
        else:
            high = middle
    return steps

million = range(1_000_000)
assert {steps_to_find(million, t) for t in (0, 1, 499_999, 777_777, 999_999)} <= {19, 20}
```

```python claim id=auto-511c69f337f2
xs = [1, 3, 5, 7, 9]
mid = 2
target = 7
assert xs[mid] < target
assert target in xs[mid + 1:]
assert target not in xs[:mid + 1]
```

```python claim id=auto-219a584b8a7a
data = list(range(1_000_000))
target = 999_999

linear_steps = 0
for value in data:
    linear_steps += 1
    if value == target:
        break

lo, hi = 0, len(data)
binary_steps = 0
while lo < hi:
    binary_steps += 1
    mid = (lo + hi) // 2
    if data[mid] < target:
        lo = mid + 1
    else:
        hi = mid

assert data[lo] == target
assert binary_steps < linear_steps
```

```python claim id=search-sort-claim-1
items = list(range(1_000_000))
most = 0
for target in [-1, 0, 499_999, 999_999, 1_000_000]:
    low, high, steps = 0, len(items) - 1, 0
    while low <= high:
        steps += 1
        mid = (low + high) // 2
        if items[mid] == target:
            break
        if items[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    most = max(most, steps)
assert most == 20
```

```python example
def binary_find(items, target):
    low, high = 0, len(items) - 1
    while low <= high:
        mid = (low + high) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1

print(binary_find([2, 5, 8, 12, 20], 12))
```

Python's `bisect` module does the halving for you. `bisect_left(items, x)` gives the index where `x` is, or where it would go to keep the list sorted. `insort` adds a value at that place.

```python claim id=auto-436fccfba9f6
from bisect import bisect_left

class Watched:
    def __init__(self, size):
        self.size, self.looks = size, 0

    def __len__(self):
        return self.size

    def __getitem__(self, i):
        self.looks += 1
        return i

items = Watched(1_000_000)
assert bisect_left(items, 777_777) == 777_777
assert items.looks <= 20
```

```python claim id=auto-7b925fdc2e0f
from bisect import bisect_left
assert bisect_left([10, 20, 30], 20) == 1
assert bisect_left([10, 20, 30], 25) == 2
assert bisect_left([10, 20, 30], 5) == 0
assert bisect_left([10, 20, 30], 99) == 3
```

```python claim id=search-sort-claim-2
import bisect

assert bisect.bisect_left([1, 3, 3, 5], 3) == 1
assert bisect.bisect_left([1, 3, 5], 4) == 2
```

```python example
import bisect

heights = [150, 160, 172, 180]
print(bisect.bisect_left(heights, 172), bisect.bisect_left(heights, 165))
bisect.insort(heights, 165)
print(heights)
```

::task rank

A binary search trusts that the list is sorted: when the middle item is too small, it throws away everything to its left. On an unsorted list, the value may be in the half it throws away.

```python claim id=auto-f07fdf33bf8e
from bisect import bisect_left
items = [9, 1, 2, 3]
i = bisect_left(items, 9)
assert i == 4
assert items[0] == 9
```

```python predict
import bisect

print(bisect.bisect_left([9, 2, 7, 4], 9))
print(bisect.bisect_left(sorted([9, 2, 7, 4]), 9))
```

`9` is right there at index 0, but the search on the unsorted list says it would go at the end. Sort first. (Sorting costs more than one linear search, so it pays off when you search the same list many times; for a single lookup, `x in items` is simpler.)

```python claim id=auto-53791f00f24e
import bisect
items = [9, 8, 7]
assert items[0] == 9
assert bisect.bisect_left(items, 9) == len(items)
```

::task member

```python claim id=auto-106e3cf9e6c8
assert [i for i, x in enumerate(["a", "b"]) if x == "b"] == [1]
```

```python claim id=auto-e77f6b54f452
from bisect import bisect_left
t = [1.2, 2.5, 2.5, 3.0]
assert bisect_left(t, 2.5) == sum(1 for v in t if v < 2.5) == 1
assert bisect_left(t, 2.8) == 3
```

```python claim id=auto-9406baeacb06
import bisect
assert bisect.bisect_left([10, 20, 30], 20) == 1
```

```python claim id=auto-f7a475c9eae2
names = ['Sam', 'Ines', 'Noa']
s = sorted(names)
assert s == ['Ines', 'Noa', 'Sam']
assert names == ['Sam', 'Ines', 'Noa']
assert names.sort() is None
assert names == ['Ines', 'Noa', 'Sam']
```

```python claim id=auto-78d5dde470d2
import bisect
l = [10, 20, 30]
assert bisect.bisect_left(l, 20) == 1
assert bisect.bisect_left(l, 25) == 2
bisect.insort(l, 25)
assert l == [10, 20, 25, 30]
```

```python claim id=auto-1270dc54bfae
def binary_search(a, x):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo < len(a) and a[lo] == x

assert binary_search([20, 40, 70, 90], 90) is True
assert binary_search([90, 20, 70, 40], 90) is False
```

```python claim id=auto-61063d13db8e
def steps_to_find(items, target):
    low, high, steps = 0, len(items), 0
    while low < high:  # each step keeps one half of what is left
        steps += 1
        middle = (low + high) // 2
        if items[middle] < target:
            low = middle + 1
        else:
            high = middle
    return steps

million = range(1_000_000)
assert {steps_to_find(million, t) for t in (0, 1, 499_999, 777_777, 999_999)} <= {19, 20}
```

```python claim id=auto-787b59035384
names = ['mo', 'al']
ordered = sorted(names)
assert ordered == ['al', 'mo']
assert names == ['mo', 'al'] and ordered is not names
```

```python claim id=remember-d90e7184fa9a
def linear_search(items, target):
    looks = 0
    for item in items:
        looks += 1
        if item == target:
            return True, looks
    return False, looks

assert linear_search([4, 8, 1], 9) == (False, 3)
assert linear_search(list(range(100_000)), -1) == (False, 100_000)
```

```python claim id=remember-47a1f9ee3b53
from bisect import bisect_left

def found(items, target):
    i = bisect_left(items, target)
    return i < len(items) and items[i] == target

assert found([1, 3, 5, 7, 9], 7)
assert 1 in [5, 9, 1, 7, 3] and not found([5, 9, 1, 7, 3], 1)
```
