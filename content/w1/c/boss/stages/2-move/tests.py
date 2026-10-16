ROOMS = {"a": {"description": "A", "exits": {"east": "b"}, "items": []}, "b": {"description": "B", "exits": {"west": "a"}, "items": []}}

def test_exit():
    expect_equal(learner["move"](ROOMS, "a", "east"), "b", 'move(rooms, "a", "east")')

def test_no_exit():
    expect_equal(learner["move"](ROOMS, "a", "north"), "a", 'move(rooms, "a", "north")')
