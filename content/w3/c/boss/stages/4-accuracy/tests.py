X = [[5050, 1.4], [5500, 1.0], [3450, 1.3], [3600, 0.7], [3350, 1.4], [4350, 0.2], [5750, 0.7], [4500, 0.3], [5700, 0.3], [6600, 0.4], [4400, 1.0], [6700, 1.4], [6650, 1.0], [3300, 1.5], [3250, 4.1], [3850, 3.6], [3900, 4.1], [6650, 3.6], [8200, 4.4], [3650, 4.2], [7050, 3.4], [3600, 4.1], [3400, 4.1], [6950, 3.4], [7350, 4.1], [7950, 3.6], [6700, 4.8], [5300, 7.7], [8050, 7.4], [7950, 7.6], [6650, 7.8], [6150, 9.2], [7650, 8.1], [6850, 9.5], [3750, 8.3], [4050, 8.9], [3950, 9.3], [5650, 7.1], [7250, 7.2], [6550, 8.4]]
Y = ['dwarf', 'dwarf', 'dwarf', 'dwarf', 'dwarf', 'dwarf', 'dwarf', 'dwarf', 'dwarf', 'dwarf', 'dwarf', 'dwarf', 'dwarf', 'dwarf', 'sunlike', 'sunlike', 'sunlike', 'sunlike', 'sunlike', 'sunlike', 'sunlike', 'sunlike', 'sunlike', 'sunlike', 'sunlike', 'sunlike', 'sunlike', 'giant', 'giant', 'giant', 'giant', 'giant', 'giant', 'giant', 'giant', 'giant', 'giant', 'giant', 'giant', 'giant']

def test_good_enough():
    score = learner["star_accuracy"](X, Y)
    if not isinstance(score, float):
        raise Failure("star_accuracy should return a plain float: wrap the score in float()")
    if score < 0.8:
        raise Failure(f"the accuracy is {score}, it should reach 0.8: did you scale the columns first?")
