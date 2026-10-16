def test_describe():
    expect_equal(learner["Canoe"]("Otter", 2).describe(), "Otter floats with 2 paddles", 'Canoe("Otter", 2).describe()')
