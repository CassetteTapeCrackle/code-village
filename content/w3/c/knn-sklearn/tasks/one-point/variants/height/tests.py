def test_size():
    expect_equal(learner["size_of"]([[10], [100]], ["small", "big"], 80), "big", "size_of([[10], [100]], [small, big], 80)")
