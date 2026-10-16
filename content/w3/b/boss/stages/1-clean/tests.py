ROWS = ["06:00,12", "07:00, 15", "08:00,", "09:00,n/a", "07:00,40", "10:00,9", "11:00,21"]

def test_clean():
    expect_equal(learner["clean"](ROWS), [12.0, 15.0, 9.0, 21.0], "clean(ROWS)")

def test_tidy_log():
    expect_equal(learner["clean"](["01:00,3", "02:00,4"]), [3.0, 4.0], "clean on a tidy log")
