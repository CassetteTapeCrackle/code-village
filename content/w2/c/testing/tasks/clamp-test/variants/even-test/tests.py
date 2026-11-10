def test_passes_on_good_code():
    """your test passes when is_even is right"""
    learner["test_is_even"]()

def test_catches_always_true():
    """your test catches an is_even that always says True"""
    fn = learner["test_is_even"]
    real = fn.__globals__["is_even"]
    fn.__globals__["is_even"] = lambda n: True
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["is_even"] = real
    raise Failure("test_is_even() should fail when is_even always says True")

def test_catches_always_false():
    """your test checks an even number"""
    fn = learner["test_is_even"]
    real = fn.__globals__["is_even"]
    fn.__globals__["is_even"] = lambda n: False
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["is_even"] = real
    raise Failure("test_is_even() should fail when is_even always says False")
