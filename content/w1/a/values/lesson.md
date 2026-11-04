+++
id = "values"
title = "Values, types and variables"
world = "w1"
region = "a"
order = 1
concepts = ["values"]
remember = ["Every value has a type: int, float, str or bool. type(x) tells you which.", "= stores a value in a name; the name can point at a new value later.", "+ adds numbers but joins strings: \"3\" + \"4\" is \"34\".", "int(), float() and str() convert; int() cuts the decimals off, round() goes to the nearest whole number (a half goes to the even one: round(2.5) is 2).", "import math loads a module of extra tools: then math.sqrt(x) and math.floor(x) work."]
[loot]
id = "pebble-counter"
name = "Pebble Counter"
+++

Python works with **values**. Every value has a **type**: whole numbers are `int`, numbers with a decimal point are `float`, text between quotes is `str`, and `True` and `False` are `bool`. `type()` tells you which one you have.

```python claim id=auto-31a48562257d
assert type(1) is int and type('a') is str and type(1.0) is float
```

```python claim id=auto-260a984735b1
assert type(1) is int
assert type(1.5) is float
assert type('a') is str
assert type(True) is bool
assert type(False) is bool
```

```python claim
assert type(7) is int and type(7.5) is float and type("7") is str and type(True) is bool
```

```python example
print(type(7), type(7.5), type("7"), type(True))
```

A **variable** is a name for a value. `=` takes the value on the right and stores it under the name on the left. You can store a new value later, even one computed from the old one.

```python claim id=auto-1953230e7bb6
x = 1
x = x + 1
assert x == 2
```

```python claim id=auto-4eaa3c0bbd52
x = 2 + 3
assert x == 5
```

```python example
apples = 3
apples = apples + 2
print(apples)
```

Numbers do arithmetic: `*` multiplies, `/` divides and always gives a float, `//` divides and rounds down to a whole number, `%` gives the remainder, and `**` raises to a power.

```python claim
assert 7 / 2 == 3.5 and type(6 / 2) is float
assert 7 // 2 == 3 and -7 // 2 == -4 and 7.5 // 2 == 3.0
assert 7 % 2 == 1 and 2 ** 3 == 8
```

```python example
print(7 * 3, 7 / 2, 7 // 2, 7 % 2, 2 ** 3)
```

Most tasks ask you to finish a small **function**. A line like `def total_price(price, quantity):` gives it a name and lists the values it receives, its **parameters**. The indented lines below are its body, and `return` hands the answer back. The starter body is `pass`, which means "nothing yet": replace it with your code. The Functions lesson explains all of this in depth later.

```python claim id=auto-450001abe5d8
def f(a):
    return a + 1
assert f(1) == 2
```

```python claim id=auto-677b25269616
import inspect
def total_price(price, quantity):
    pass
assert list(inspect.signature(total_price).parameters) == ['price', 'quantity']
assert total_price.__name__ == 'total_price'
```

::task total-price

Types matter. `+` adds numbers, but it **joins** strings. So `"3" + "4"` is `"34"`, not 7. Convert first with `int()`, `float()` or `str()`.

```python claim id=auto-0b19fb6484f0
assert '3' + '4' == '34'
assert '3' + '4' != 7
```

```python claim
assert "3" + "4" == "34" and int("3") + int("4") == 7 and float("2.5") == 2.5 and str(12) == "12"
```

```python predict
a = "3"
b = "4"
print(a + b, int(a) + int(b))
```

::task add-strings

`int()` on a float cuts the decimals off (it does not round), and `str()` turns any value into text, which is handy for building messages.

```python claim id=auto-80b6ff8f3836
assert int(2.9) == 2
assert int(-2.9) == -2
assert str(5) == '5' and str(1.5) == '1.5' and str(True) == 'True' and str(None) == 'None'
```

```python claim
assert int(9.99) == 9 and int(-9.99) == -9
assert round(9.99) == 10 and round(2.5) == 2 and round(3.5) == 4
```

```python example
print(int(9.99), round(9.99), str(12) + " eggs")
```

Python also comes with **modules** of extra tools. `import math` loads one, and then its tools are ready to use with `math.` in front.

```python claim id=auto-720eb3ca6ecd
import math
assert math.sqrt(16) == 4.0
```

```python claim id=auto-089b3fc04e42
import math
assert math.sqrt(9) == 3.0
```

```python example
import math
print(math.sqrt(16), math.floor(9.99), math.pi)
```

::task describe

```python claim id=auto-cd70ffe8ee8b
assert str(12) == '12'
assert isinstance(str(12), str)
```

```python claim id=auto-d05a075dccff
assert type(1) is int
assert type(1.5) is float
assert type('a') is str
assert type(True) is bool
```

```python claim id=auto-db7ec3cdfcec
x = 1
assert x == 1
x = 2
assert x == 2
```

```python claim id=auto-843056d01e96
assert 3 + 4 == 7
assert '3' + '4' == '34'
```

```python claim id=auto-cd9c3cd83895
assert int(2.9) == 2
assert int(-2.9) == -2
assert round(2.6) == 3
assert round(2.5) == 2
assert round(3.5) == 4
assert float('1.5') == 1.5
assert str(3) == '3'
```

```python claim id=auto-67b42be6f7e0
import math
assert math.sqrt(9) == 3.0
assert math.floor(2.7) == 2
```
