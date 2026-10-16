def shout(word):
    return word.upper() + "!"


def test_shout():
    assert (shout("hey") == "HEY!", "shout should add !")
