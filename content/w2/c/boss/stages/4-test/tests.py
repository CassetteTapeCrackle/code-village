def test_passes_on_your_registry():
    """your test passes on your registry"""
    learner["test_registry"]()

def test_catches_careless_registry():
    """your test catches a registry that lets a name arrive twice"""
    fn = learner["test_registry"]
    real = fn.__globals__["Registry"]

    class Careless(real):
        def arrive(self, animal):
            self.animals.append(animal)
            self.log.append(f"{animal.name} arrived")

    fn.__globals__["Registry"] = Careless
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["Registry"] = real
    raise Failure("test_registry() should fail for a registry that lets the same name arrive twice")

def test_catches_registry_that_never_finds():
    """your test catches a registry whose find always gives None"""
    fn = learner["test_registry"]
    real = fn.__globals__["Registry"]

    class Blind(real):
        def arrive(self, animal):
            if any(a.name == animal.name for a in self.animals):
                raise ValueError(f"{animal.name} is already registered")
            self.animals.append(animal)
            self.log.append(f"{animal.name} arrived")

        def find(self, name):
            return None

    fn.__globals__["Registry"] = Blind
    try:
        fn()
    except Exception:
        return
    finally:
        fn.__globals__["Registry"] = real
    raise Failure("test_registry() should fail for a registry whose find never finds an animal")

def test_catches_registry_that_finds_anything():
    """your test catches a registry whose find gives the first animal for any name"""
    fn = learner["test_registry"]
    real = fn.__globals__["Registry"]

    class Eager(real):
        def arrive(self, animal):
            if any(a.name == animal.name for a in self.animals):
                raise ValueError(f"{animal.name} is already registered")
            self.animals.append(animal)
            self.log.append(f"{animal.name} arrived")

        def find(self, name):
            return self.animals[0] if self.animals else None

    fn.__globals__["Registry"] = Eager
    try:
        fn()
    except Exception:
        return
    finally:
        fn.__globals__["Registry"] = real
    raise Failure("test_registry() should fail for a registry whose find gives an animal for an unknown name")
