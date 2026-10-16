def test_label():
    known = [((0, 0), "valley"), ((10, 10), "summit")]
    expect_equal(learner["label_of"](known, (9, 7)), "summit", "label_of(known, (9, 7))")
