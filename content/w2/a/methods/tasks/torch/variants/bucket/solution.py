class Bucket:
    def __init__(self, litres):
        self.litres = litres

    def pour(self, n):
        self.litres = max(self.litres - n, 0)

    def is_dry(self):
        return self.litres == 0
