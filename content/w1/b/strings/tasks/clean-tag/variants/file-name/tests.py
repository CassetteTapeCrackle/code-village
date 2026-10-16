def test_notes():
    expect_equal(learner["file_name"]("  My Notes "), "my_notes.txt", 'file_name("  My Notes ")')

def test_one_word():
    expect_equal(learner["file_name"]("todo"), "todo.txt", 'file_name("todo")')
