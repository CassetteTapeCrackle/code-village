def test_keeps_the_twin():
    a = ["tent"]
    b = ["tent"]
    out = learner["without_exact"]([a, b], b)
    expect_equal(len(out) == 1 and out[0] is a, True, "without_exact([a, b], b) keeps a, when a and b both hold [\"tent\"]")

def test_only_bag():
    c = ["map"]
    expect_equal(learner["without_exact"]([c], c), [], 'without_exact([c], c)')
