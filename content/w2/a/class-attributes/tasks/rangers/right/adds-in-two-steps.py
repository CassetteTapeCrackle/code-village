class Ranger:
    count = 0

    def __init__(self, name):
        self.name = name
        Ranger.count = Ranger.count + 1
