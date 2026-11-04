class Canoe:
    capacity = 2

    def __init__(self):
        self.crew = []

    def board(self, person):
        if len(self.crew) < self.capacity:
            self.crew += [person]
            return True
        return False
