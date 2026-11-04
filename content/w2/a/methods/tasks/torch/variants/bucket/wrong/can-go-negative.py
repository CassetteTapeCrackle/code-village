class Bucket:
    def __init__(self, litres):
        self.litres = litres

    def pour(self, n):
        self.litres = self.litres - n

    def is_dry(self):
        return self.litres == 0
