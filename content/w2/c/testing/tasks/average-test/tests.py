def test_passes_on_good_code():
    """your test passes when average is right"""
    learner["test_average"]()

def test_catches_empty_list():
    """your test catches an average that returns 0 for an empty list"""
    fn = learner["test_average"]
    real = fn.__globals__["average"]
    fn.__globals__["average"] = lambda numbers: sum(numbers) / len(numbers) if len(numbers) > 0 else 0
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["average"] = real
    raise Failure("test_average() should fail when average gives 0 for an empty list")

def test_catches_single():
    """your test catches an average that gets one number wrong"""
    fn = learner["test_average"]
    real = fn.__globals__["average"]
    fn.__globals__["average"] = lambda numbers: sum(numbers) / len(numbers) if len(numbers) != 1 else 0
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["average"] = real
    raise Failure("test_average() should fail when average([5]) is wrong")

def test_catches_single_too_big():
    """your test checks that one number gives exactly that number"""
    fn = learner["test_average"]
    real = fn.__globals__["average"]
    fn.__globals__["average"] = lambda numbers: numbers[0] + 1 if len(numbers) == 1 else real(numbers)
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["average"] = real
    raise Failure("test_average() should fail when average([5]) gives 6: check it with ==")
