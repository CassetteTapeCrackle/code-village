def test_empty():
    p = learner["Playlist"]("Quiet")
    expect_equal((len(p), str(p), "Dawn" in p), (0, "Quiet: 0 songs", False), "an empty playlist")

def test_same_song_twice():
    """the same song can be added twice"""
    p = learner["Playlist"]("Loop")
    s = learner["Song"]("Dawn", 90)
    p.add(s)
    p.add(s)
    expect_equal(len(p), 2, "len after adding Dawn twice")

def test_ties_keep_order():
    """songs of equal length keep the order they were added in"""
    S = learner["Song"]
    p = learner["Playlist"]("Tie")
    for s in [S("A", 60), S("B", 30), S("C", 60)]:
        p.add(s)
    expect_equal([s.title for s in p.sorted_by_length()], ["B", "A", "C"], "sorted_by_length() of A 60, B 30, C 60")

def test_two_playlists():
    a = learner["Playlist"]("One")
    a.add(learner["Song"]("Dawn", 90))
    expect_equal(len(learner["Playlist"]("Two")), 0, "a second playlist's length")
