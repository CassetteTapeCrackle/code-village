def test_penguin():
    expect_equal(learner["Penguin"]("Pip").move(), "Pip waddles", 'Penguin("Pip").move()')

def test_other_birds():
    expect_equal(learner["Bird"]("Wren").move(), "Wren flies", 'Bird("Wren").move()')
