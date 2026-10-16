def test_animal():
    expect_equal(learner["Animal"]("Sly", "fox").describe(), "Sly the fox", 'Animal("Sly", "fox").describe()')

def test_bird():
    expect_equal(learner["Bird"]("Ollie", "owl", 95).describe(), "Ollie the owl, wingspan 95 cm", 'Bird("Ollie", "owl", 95).describe()')
