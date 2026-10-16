def test_order():
    lines = ["Noa: 12, 15, 9", "Sam: 18", "Ines: 10"]
    expect_equal(learner["ranking"](lines), [("Sam", 18.0), ("Noa", 12.0), ("Ines", 10.0)],
                 'ranking(["Noa: 12, 15, 9", "Sam: 18", "Ines: 10"])')

def test_ties():
    """equal averages are sorted by name"""
    lines = ["Sam: 14", "Alex: 14", "Noa: 10, 18"]
    expect_equal(learner["ranking"](lines), [("Alex", 14.0), ("Noa", 14.0), ("Sam", 14.0)],
                 'ranking(["Sam: 14", "Alex: 14", "Noa: 10, 18"])')
