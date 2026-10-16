def test_passes_on_good_code():
    """your test passes when total is right"""
    learner["test_total"]()

def test_catches_broken_total():
    """your test catches a total that always returns 0"""
    fn = learner["test_total"]
    real = fn.__globals__["total"]
    fn.__globals__["total"] = lambda numbers: 0
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["total"] = real
    raise Failure("test_total() should fail when total always returns 0")
