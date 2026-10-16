ROOMS = {"a": {"description": "A", "exits": {"east": "b"}, "items": ["key"]}, "b": {"description": "B", "exits": {}, "items": []}}

def test_messy_command():
    """extra spaces and capitals"""
    expect_equal(learner["parse"]("  Go   NORTH  "), ("go", "north"), 'parse("  Go   NORTH  ")')

def test_two_word_item():
    expect_equal(learner["parse"]("take old lamp"), ("take", "old lamp"), 'parse("take old lamp")')

def test_take_twice():
    """taking the same item twice works only once"""
    rooms = {k: {**v, "items": list(v["items"])} for k, v in ROOMS.items()}
    satchel = []
    expect_equal([learner["take"](rooms, "a", "key", satchel), learner["take"](rooms, "a", "key", satchel)], [True, False])
    expect_equal(satchel, ["key"])

def test_go_nowhere():
    expect_equal(learner["move"](ROOMS, "a", ""), "a", 'move(rooms, "a", "")')
