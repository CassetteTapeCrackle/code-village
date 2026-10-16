def test_passes_on_good_code():
    """your test passes when shout is right"""
    learner["test_shout"]()

def test_catches_broken_shout():
    """your test catches a shout that forgets the !"""
    fn = learner["test_shout"]
    real = fn.__globals__["shout"]
    fn.__globals__["shout"] = lambda word: word.upper()
    try:
        fn()
    except AssertionError:
        return
    finally:
        fn.__globals__["shout"] = real
    raise Failure("test_shout() should fail when shout forgets the !")
