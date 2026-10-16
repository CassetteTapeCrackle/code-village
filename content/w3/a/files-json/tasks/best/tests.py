import json

def test_best():
    with open("scores.json", "w") as f:
        json.dump({"Noa": 7, "Sam": 12, "Ines": 9}, f)
    expect_equal(learner["best_player"]("scores.json"), "Sam", "best_player on Noa 7, Sam 12, Ines 9")

def test_one():
    with open("one.json", "w") as f:
        json.dump({"Lou": 1}, f)
    expect_equal(learner["best_player"]("one.json"), "Lou", "best_player on Lou 1")
