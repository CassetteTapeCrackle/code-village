class Tally:
    def __init__(self):
        self.total = 0

    def add(self, n):
        self.total += n

    def add_all(self, numbers):
        for n in numbers:
            self.add(n)
