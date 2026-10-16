def test_song():
    S = learner["Song"]
    expect_equal((repr(S("Dawn", 90)), S("Dawn", 90) == S("Dawn", 90)), ("Song(title='Dawn', seconds=90)", True), 'Song("Dawn", 90)')
