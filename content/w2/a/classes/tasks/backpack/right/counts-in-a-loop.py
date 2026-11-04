class Backpack:
    def __init__(self, owner):
        self.owner = owner
        self.items = []

    def pack(self, item):
        self.items.append(item)

    def count(self):
        total = 0
        for _ in self.items:
            total += 1
        return total
