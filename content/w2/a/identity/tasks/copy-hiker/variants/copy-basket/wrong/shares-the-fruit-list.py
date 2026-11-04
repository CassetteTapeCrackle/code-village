class Basket:
    def __init__(self, owner, fruits):
        self.owner = owner
        self.fruits = fruits


def copy_basket(basket):
    return Basket(basket.owner, basket.fruits)
