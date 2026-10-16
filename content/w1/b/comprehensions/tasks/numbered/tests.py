def test_two():
    expect_equal(learner["numbered"](["tea", "jam"]), ["1. tea", "2. jam"], 'numbered(["tea", "jam"])')

def test_empty():
    expect_equal(learner["numbered"]([]), [], "numbered([])")
