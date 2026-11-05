def test_size():
    expect_equal(learner["size_of"]([[10], [100]], ["small", "big"], 80), "big", "size_of([[10], [100]], [small, big], 80)")

def test_closest_of_three():
    expect_equal(learner["size_of"]([[10], [40], [100]], ["small", "tall", "big"], 45), "tall", "size_of([[10], [40], [100]], [small, tall, big], 45)")
