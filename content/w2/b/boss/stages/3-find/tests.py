def test_contains():
    p = learner["Playlist"]("Evening")
    p.add(learner["Song"]("Dusk", 120))
    expect_equal(("Dusk" in p, "Dawn" in p), (True, False), '"Dusk" in playlist, "Dawn" in playlist')

def test_sorted():
    S = learner["Song"]
    p = learner["Playlist"]("Mixed")
    for s in [S("Long", 200), S("Short", 40), S("Middle", 100)]:
        p.add(s)
    expect_equal([s.title for s in p.sorted_by_length()], ["Short", "Middle", "Long"], "sorted_by_length()")
