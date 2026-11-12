+++
id = "inheritance"
title = "Inheritance"
world = "w2"
region = "c"
order = 9
concepts = ["inheritance"]
teaches = ["fn-super"]
remember = ["class Owl(Animal) makes Owl a kind of Animal: it gets all of Animal's methods.", "A method with the same name in the child overrides the parent's.", "super().describe() calls the parent's version from inside the child.", "A child's __init__ must call super().__init__(...), or the parent's attributes are never set."]
[loot]
id = "family-tree-sketch"
name = "Family Tree Sketch"
+++

A class can be built on another one. `class Owl(Animal)` makes `Owl` a **child** of `Animal`: an owl is an animal, and it gets every method `Animal` has. A method written again in the child **overrides** the parent's.

```python claim id=auto-e756f2b5ea73
class A:
    def f(self):
        return 'a'
class B(A):
    def f(self):
        return 'b'
assert B().f() == 'b'
assert A().f() == 'a'
```

```python claim id=auto-36600fb84adc
class Animal:
    def eat(self):
        return 'eats'
class Owl(Animal):
    pass
o = Owl()
assert issubclass(Owl, Animal)
assert isinstance(o, Animal)
assert o.eat() == 'eats'
```

```python claim id=auto-0027056ee01a
class A:
    pass
class B(A):
    pass
assert issubclass(B, A)
```

```python example
class Animal:
    def __init__(self, name):
        self.name = name

    def describe(self):
        return f"{self.name} is an animal"

    def sound(self):
        return "..."

class Owl(Animal):
    def sound(self):
        return "hoo"

o = Owl("Ollie")
print(o.describe(), o.sound(), isinstance(o, Animal))
```

Python looks for a method in the object's class first, then in its parent, then the parent's parent.

```python claim id=auto-54f594e74f37
class A:
    def f(self):
        return 'a'
class B(A):
    pass
class C(B):
    pass
assert C.__mro__[:3] == (C, B, A)
assert C().f() == 'a'
class B2(A):
    def f(self):
        return 'b'
class C2(B2):
    pass
assert C2().f() == 'b'
```

```python claim id=inheritance-claim-1
class A:
    pass

class B(A):
    pass

class C(B):
    pass

assert [k.__name__ for k in C.__mro__] == ["C", "B", "A", "object"]
```

```python predict
class A:
    def hi(self):
        return "A"

class B(A):
    pass

class C(B):
    def hi(self):
        return "C"

print(B().hi(), C().hi())
```

`super()` reaches the parent's version, so the child can add to it instead of starting over.

```python claim id=auto-2007bbfa77de
class Parent:
    def greet(self):
        return "hello"
class Child(Parent):
    def greet(self):
        return super().greet() + " world"
assert Child().greet() == "hello world"
```

```python example
class Animal:
    def __init__(self, name):
        self.name = name

    def describe(self):
        return f"{self.name} is an animal"

class Fox(Animal):
    def __init__(self, name, tail):
        super().__init__(name)
        self.tail = tail

    def describe(self):
        return super().describe() + f" with a {self.tail} tail"

print(Fox("Sly", "bushy").describe())
```

::task fruit-tree

::task penguin

A child with its own `__init__` replaces the parent's. Without `super().__init__(...)`, the parent's attributes are never set, and using them raises `AttributeError`.

```python claim id=auto-df34f2e147f1
class P:
    def __init__(self):
        self.a = 1
class C(P):
    def __init__(self):
        pass
try:
    C().a
    raised = False
except AttributeError:
    raised = True
assert raised
```

```python claim id=auto-5edd558a7b3d
class P:
    def __init__(self):
        self.a = 1
class C(P):
    def __init__(self):
        self.b = 2
c = C()
assert c.b == 2
assert not hasattr(c, 'a')
assert C.__init__ is not P.__init__
```

```python claim id=inheritance-claim-2
class Animal:
    def __init__(self, name):
        self.name = name

class Squirrel(Animal):
    def __init__(self, name):
        self.stash = []

try:
    Squirrel("Nutkin").name
    raised = False
except AttributeError:
    raised = True
assert raised
```

::task squirrel

```python claim id=auto-d87d71d1d04c
class A:
    def __init__(self, name):
        self.name = name
class S(A):
    def __init__(self, name):
        super().__init__(name)
        self.stash = []
s = S('Nut')
assert s.name == 'Nut' and s.stash == []
```

```python claim id=auto-0a76000031f7
class A:
    def f(self):
        return 'a'
class B(A):
    def f(self):
        return 'b'
assert B().f() == 'b'
```

```python claim id=auto-a5c2d5c1e8c9
class A:
    def describe(self):
        return 'A'
class B(A):
    def describe(self):
        return super().describe() + 'B'
assert B().describe() == 'AB'
```

```python claim id=auto-7abda6f6888b
class Animal:
    def eat(self):
        return 'eats'
class Owl(Animal):
    pass
assert Owl().eat() == 'eats'
assert issubclass(Owl, Animal)
```

```python claim id=remember-bfb857ce5a3a
class Animal:
    def __init__(self, name):
        self.name = name

class Forgetful(Animal):
    def __init__(self, name, wings):
        self.wings = wings

class Bird(Animal):
    def __init__(self, name, wings):
        super().__init__(name)
        self.wings = wings

try:
    Forgetful("Ada", 2).name
    raised = False
except AttributeError:
    raised = True
assert raised
assert Bird("Ada", 2).name == "Ada"
```
