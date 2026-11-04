class Basket:
    def __init__(self):
        self.fruits = []

    def put(self, fruit):
        self.fruits.append(fruit)

    def has(self, fruit):
        return len(self.fruits) > 0 and self.fruits[0] == fruit
