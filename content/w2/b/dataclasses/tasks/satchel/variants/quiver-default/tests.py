def test_own_arrows():
    a = learner["Quiver"]("Alex")
    a.arrows.append("ash")
    expect_equal(learner["Quiver"]("Mika").arrows, [], "a second quiver's arrows")
