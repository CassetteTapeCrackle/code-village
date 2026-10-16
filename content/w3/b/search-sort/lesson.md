+++
id = "search-sort"
title = "Searching fast"
world = "w3"
region = "b"
order = 7
concepts = ["search-sort"]
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

::task find-all

When the list is **sorted**, there is a much faster way, like finding a word in a dictionary. Look at the middle item: if it is too small, the target can only be in the right half, so throw the left half away, and repeat. This is a **binary search**. Each step halves what is left, so a million items take about 20 steps.

```python claim
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

```python claim
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

```python predict
import bisect

print(bisect.bisect_left([9, 2, 7, 4], 9))
print(bisect.bisect_left(sorted([9, 2, 7, 4]), 9))
```

`9` is right there at index 0, but the search on the unsorted list says it would go at the end. Sort first. (Sorting costs more than one linear search, so it pays off when you search the same list many times; for a single lookup, `x in items` is simpler.)

::task member
