class Basket:
    def __init__(self):
        self.fruits = []

    def put(self, fruit):
        self.fruits.append(fruit)

    def has(self, fruit):
        return True
