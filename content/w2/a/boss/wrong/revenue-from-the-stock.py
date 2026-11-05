class Inventory:
    def __init__(self, product, stock, price):
        self.product = product
        self.stock = stock
        self.price = price
        self.sales = 0
        self.revenue = 0

    def sell(self, quantity):
        if quantity > self.stock:
            return False
        self.stock -= quantity
        self.sales += quantity
        self.revenue += self.stock * self.price
        return True

    def restock(self, quantity):
        self.stock += quantity

    def value(self):
        return self.stock * self.price
