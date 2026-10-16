def test_repr_and_eq():
    S = learner["Sapling"]
    expect_equal((repr(S("oak")), S("oak") == S("oak", 1)), ("Sapling(name='oak', height=1)", True), 'repr(Sapling("oak")), and == with Sapling("oak", 1)')

def test_grow():
    s = learner["Sapling"]("ash", 3)
    s.grow(4)
    expect_equal(s.height, 7, 'Sapling("ash", 3), grow(4), then height')
