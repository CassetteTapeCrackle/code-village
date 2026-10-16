def test_known():
    expect_equal(learner["phone"]({"Noa": "0612"}, "Noa"), "0612", 'phone({"Noa": "0612"}, "Noa")')

def test_unknown():
    expect_equal(learner["phone"]({"Noa": "0612"}, "Sam"), "unknown", 'phone({"Noa": "0612"}, "Sam")')
