def test_both():
    expect_equal((learner["Ostrich"]("Oz").move(), learner["Bird"]("Jay").move()), ("Oz runs", "Jay flies"), "an ostrich and a jay move")
