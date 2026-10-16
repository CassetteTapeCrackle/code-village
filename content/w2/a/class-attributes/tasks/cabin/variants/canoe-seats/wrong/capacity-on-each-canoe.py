class Canoe:
    def __init__(self):
        self.crew = []
        self.capacity = 2

    def board(self, person):
        if len(self.crew) < self.capacity:
            self.crew.append(person)
            return True
        return False
