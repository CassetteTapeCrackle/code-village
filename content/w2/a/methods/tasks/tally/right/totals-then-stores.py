class Tally:
    def __init__(self):
        self.total = 0

    def add(self, n):
        self.total += n

    def add_all(self, numbers):
        total = self.total
        for n in numbers:
            total = total + n
        self.total = total
