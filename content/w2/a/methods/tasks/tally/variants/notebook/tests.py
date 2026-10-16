def test_lines():
    n = learner["Notebook"]()
    n.write("hi")
    n.write_lines(["a", "b"])
    expect_equal(n.lines, ["hi", "a", "b"], 'write("hi"), write_lines(["a", "b"])')
