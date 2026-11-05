class Quiver:
    def __init__(self, arrows):
        self.arrows = arrows

    def __len__(self):
        total = 0
        for _ in self.arrows:
            total += 1
        return total
