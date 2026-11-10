def test_passes_on_good_code():
    """your test passes when clamp is right"""
    learner["test_clamp"]()

def test_catches_missing_high():
    """your test catches a clamp that ignores high"""
    fn = learner["test_clamp"]
    real = fn.__globals__["clamp"]
    fn.__globals__["clamp"] = lambda n, low, high: max(low, n)
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["clamp"] = real
    raise Failure("test_clamp() should fail when clamp ignores high")

def test_catches_missing_low():
    """your test catches a clamp that ignores low"""
    fn = learner["test_clamp"]
    real = fn.__globals__["clamp"]
    fn.__globals__["clamp"] = lambda n, low, high: min(n, high)
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["clamp"] = real
    raise Failure("test_clamp() should fail when clamp ignores low")

def test_catches_a_wrong_middle():
    """your test checks a number in the middle"""
    fn = learner["test_clamp"]
    real = fn.__globals__["clamp"]
    fn.__globals__["clamp"] = lambda n, low, high: n + 1 if low < n < high else max(low, min(n, high))
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["clamp"] = real
    raise Failure("test_clamp() should fail when clamp gets a number in the middle wrong")
