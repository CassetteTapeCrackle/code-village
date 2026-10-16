def test_arrive_and_find():
    r = learner["Registry"]()
    r.arrive(learner["Animal"]("Sly", "fox"))
    expect_equal((r.find("Sly").species, r.log), ("fox", ["Sly arrived"]), "arrive(Sly the fox), then find and log")

def test_duplicate():
    """a name can only arrive once"""
    r = learner["Registry"]()
    r.arrive(learner["Animal"]("Sly", "fox"))
    try:
        r.arrive(learner["Animal"]("Sly", "fox"))
    except ValueError:
        return
    raise Failure("a second Sly should raise ValueError")
