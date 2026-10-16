import json

TEXT = "product,quantity,price\nlamp,2,12.5\nrope,3,4\nlamp,1,12.5\npick,1,30"

def test_round_trip():
    learner["save_report"]("report.json", learner["read_sales"](TEXT))
    expected = {"total": 79.5, "by_product": {"lamp": 37.5, "rope": 12.0, "pick": 30.0}, "best": "lamp"}
    expect_equal(learner["load_report"]("report.json"), expected, "load_report after save_report")

def test_real_json():
    learner["save_report"]("report.json", learner["read_sales"](TEXT))
    with open("report.json") as f:
        expect_equal(json.load(f)["best"], "lamp", "the best product, read with json.load")
