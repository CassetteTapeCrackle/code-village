def test_own_books():
    a = learner["Shelf"]()
    b = learner["Shelf"]()
    a.add("Ferns")
    expect_equal((a.books, b.books), (["Ferns"], []), "add a book to one of two shelves")
