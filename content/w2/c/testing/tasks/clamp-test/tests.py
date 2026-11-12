def test_passes_on_good_code():
    """your test passes when clamp is right"""
    learner["test_clamp"]()

def test_passes_on_another_good_clamp():
    """your test passes with any correct clamp"""
    fn = learner["test_clamp"]
    real = fn.__globals__["clamp"]
    # the same clamp whenever low <= high, so only a check with low above high tells them apart
    fn.__globals__["clamp"] = lambda n, low, high: min(high, max(n, low))
    try:
        fn()
    except AssertionError:
        raise Failure("test_clamp() should pass with any correct clamp: keep low below high") from None
    finally:
        fn.__globals__["clamp"] = real

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

def test_catches_off_by_one():
    """your test checks that each result equals the clamped value"""
    fn = learner["test_clamp"]
    real = fn.__globals__["clamp"]
    # one result wrong at a time: a loose check (<= or >=) on any of the three lets its bug through
    off_by_one = [
        lambda n, low, high: n - 1 if low < n < high else real(n, low, high),
        lambda n, low, high: low + 1 if n < low else real(n, low, high),
        lambda n, low, high: high - 1 if n > high else real(n, low, high),
    ]
    try:
        for wrong in off_by_one:
            fn.__globals__["clamp"] = wrong
            try:
                fn()
            except AssertionError:
                continue
            raise Failure("test_clamp() should fail when one result of clamp is off by one: check each with ==")
    finally:
        fn.__globals__["clamp"] = real
