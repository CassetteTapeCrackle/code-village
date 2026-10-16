def test_twin():
    a = {"text": "hi"}
    b = {"text": "hi"}
    out = learner["without_note"]([a, b], b)
    expect_equal(len(out) == 1 and out[0] is a, True, "without_note([a, b], b) keeps a")
