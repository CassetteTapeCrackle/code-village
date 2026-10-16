def fresh():
    return {"a": {"description": "A", "exits": {}, "items": ["key", "map"]}}

def test_takes():
    rooms, satchel = fresh(), []
    expect_equal(learner["take"](rooms, "a", "key", satchel), True, 'take(rooms, "a", "key", satchel)')
    expect_equal((rooms["a"]["items"], satchel), (["map"], ["key"]))

def test_refuses_missing():
    rooms, satchel = fresh(), []
    expect_equal(learner["take"](rooms, "a", "sword", satchel), False, 'take(rooms, "a", "sword", satchel)')
    expect_equal((rooms["a"]["items"], satchel), (["key", "map"], []))
