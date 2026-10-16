class Backpack:
    def __init__(self, owner):
        self.owner = owner
        self.items = []

    def pack(self, item):
        self.items.append(item)

    def count(self):
        # return how many items are packed
        pass
