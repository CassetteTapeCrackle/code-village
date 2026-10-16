def test_noa():
    expect_equal(learner["describe"]("Noa", 12), "Noa is 12 years old", 'describe("Noa", 12)')

def test_sam():
    expect_equal(learner["describe"]("Sam", 9), "Sam is 9 years old", 'describe("Sam", 9)')
