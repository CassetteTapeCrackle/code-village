def test_hey():
    expect_equal(learner["whisper"]("HEY"), "hey...", 'whisper("HEY")')

def test_quiet():
    expect_equal(learner["whisper"]("ok"), "ok...", 'whisper("ok")')
