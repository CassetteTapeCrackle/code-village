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
