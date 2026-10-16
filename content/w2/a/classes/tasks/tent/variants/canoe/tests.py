def test_attributes():
    canoe = learner["Canoe"]("Otter", 2)
    expect_equal((canoe.name, canoe.seats), ("Otter", 2), 'Canoe("Otter", 2)')

def test_two_canoes():
    expect_equal(learner["Canoe"]("Pike", 3).seats, 3, 'Canoe("Pike", 3).seats')
