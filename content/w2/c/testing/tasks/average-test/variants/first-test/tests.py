def test_passes_on_good_code():
    """your test passes when first is right"""
    learner["test_first"]()

def test_catches_none():
    """your test catches a first that returns None for an empty list"""
    fn = learner["test_first"]
    real = fn.__globals__["first"]
    fn.__globals__["first"] = lambda items: items[0] if len(items) > 0 else None
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["first"] = real
    raise Failure("test_first() should fail when first returns None for an empty list")
