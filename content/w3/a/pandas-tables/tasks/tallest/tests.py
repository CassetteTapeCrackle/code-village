def test_sam():
    expect_equal(learner["tallest"]("name,height\nNoa,160\nSam,172\nLou,155"), "Sam", "tallest(Noa 160, Sam 172, Lou 155)")

def test_first_row():
    expect_equal(learner["tallest"]("name,height\nMika,190\nAlex,150"), "Mika", "tallest(Mika 190, Alex 150)")
