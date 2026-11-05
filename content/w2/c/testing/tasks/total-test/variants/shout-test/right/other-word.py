def shout(word):
    return word.upper() + "!"


def test_shout():
    assert shout("hi") == "HI!", "shout should add !"
