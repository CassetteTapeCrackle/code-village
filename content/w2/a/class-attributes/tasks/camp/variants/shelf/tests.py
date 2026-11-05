def test_own_books():
    a = learner["Shelf"]()
    b = learner["Shelf"]()
    a.add("Ferns")
    expect_equal((a.books, b.books), (["Ferns"], []), "add a book to one of two shelves")

def test_keeps_every_book():
    shelf = learner["Shelf"]()
    shelf.add("Ferns")
    shelf.add("Moss")
    expect_equal(shelf.books, ["Ferns", "Moss"], "a shelf after adding Ferns and Moss")
