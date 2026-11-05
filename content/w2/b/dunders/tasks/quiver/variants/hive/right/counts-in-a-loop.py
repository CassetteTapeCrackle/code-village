class Hive:
    def __init__(self, bees):
        self.bees = bees

    def __len__(self):
        total = 0
        for _ in self.bees:
            total += 1
        return total
