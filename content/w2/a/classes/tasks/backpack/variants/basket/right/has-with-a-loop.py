class Basket:
    def __init__(self):
        self.fruits = []

    def put(self, fruit):
        self.fruits.append(fruit)

    def has(self, fruit):
        for f in self.fruits:
            if f == fruit:
                return True
        return False
