def test_find_missing():
    expect_equal(learner["Registry"]().find("Ghost"), None, 'find("Ghost") in an empty registry')

def test_duplicate_message():
    """the error names the animal"""
    r = learner["Registry"]()
    r.arrive(learner["Animal"]("Sly", "fox"))
    try:
        r.arrive(learner["Animal"]("Sly", "fox"))
    except ValueError as e:
        expect_equal(str(e), "Sly is already registered", "the ValueError's message")
        return
    raise Failure("a second Sly should raise ValueError")

def test_empty_keeper():
    expect_equal(learner["Keeper"]("Sam").feed_all(), [], "feed_all() with no animals")

def test_bird_is_animal():
    b = learner["Bird"]("Ollie", "owl", 95)
    expect_equal((isinstance(b, learner["Animal"]), b.name), (True, "Ollie"), "a Bird is an Animal with a name")

def test_keeper_keeps_its_name():
    expect_equal(learner["Keeper"]("Sam").name, "Sam", "the name of Keeper('Sam')")

def test_find_picks_by_name():
    """find skips animals with other names, including ones that sort before the name"""
    r = learner["Registry"]()
    r.arrive(learner["Animal"]("Ollie", "owl"))
    r.arrive(learner["Animal"]("Sly", "fox"))
    expect_equal(r.find("".join(["S", "ly"])).species, "fox", 'find("Sly") after Ollie and Sly arrived')
