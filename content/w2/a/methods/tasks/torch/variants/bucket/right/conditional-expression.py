class Bucket:
    def __init__(self, litres):
        self.litres = litres

    def pour(self, n):
        self.litres = self.litres - n if self.litres > n else 0

    def is_dry(self):
        return self.litres == 0
