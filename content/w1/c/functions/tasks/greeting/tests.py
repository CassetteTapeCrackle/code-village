def test_default():
    expect_equal(learner["greeting"]("Noa"), "Hello, Noa!", 'greeting("Noa")')

def test_given():
    expect_equal(learner["greeting"]("Sam", "Hi"), "Hi, Sam!", 'greeting("Sam", "Hi")')
