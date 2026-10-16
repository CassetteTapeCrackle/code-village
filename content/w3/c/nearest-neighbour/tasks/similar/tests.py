ANIMALS = [("mouse", 20, 0.1), ("cat", 4000, 0.5), ("snake", 500, 1.5)]

def test_snake():
    expect_equal(learner["most_similar"](ANIMALS, (150, 1.3)), "snake", "most_similar(ANIMALS, (150 g, 1.3 m))")

def test_cat():
    expect_equal(learner["most_similar"](ANIMALS, (3500, 0.6)), "cat", "most_similar(ANIMALS, (3500 g, 0.6 m))")
