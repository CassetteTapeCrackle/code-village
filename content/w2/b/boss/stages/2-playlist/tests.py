def test_playlist():
    p = learner["Playlist"]("Morning")
    p.add(learner["Song"]("Dawn", 90))
    p.add(learner["Song"]("Dew", 75))
    expect_equal((len(p), str(p)), (2, "Morning: 2 songs"), "a playlist with two songs")
