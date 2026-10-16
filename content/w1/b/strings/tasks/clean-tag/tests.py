def test_village():
    expect_equal(learner["clean_tag"]("  Python Village "), "python-village", 'clean_tag("  Python Village ")')

def test_already_clean():
    expect_equal(learner["clean_tag"]("loops"), "loops", 'clean_tag("loops")')
