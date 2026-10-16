def test_two_items():
    bag = learner["Backpack"]("Sam")
    bag.pack("rope")
    bag.pack("map")
    expect_equal(bag.count(), 2, 'pack("rope"), pack("map"), then count()')

def test_empty():
    expect_equal(learner["Backpack"]("Ines").count(), 0, "a new backpack's count()")
