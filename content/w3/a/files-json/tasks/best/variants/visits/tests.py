import json

def test_sign():
    with open("book.json", "w") as f:
        json.dump(["Mika"], f)
    learner["sign"]("book.json", "Alex")
    with open("book.json") as f:
        expect_equal(json.load(f), ["Mika", "Alex"], 'the list after sign("book.json", "Alex")')
