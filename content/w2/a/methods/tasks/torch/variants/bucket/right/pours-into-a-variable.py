class Bucket:
    def __init__(self, litres):
        self.litres = litres

    def pour(self, n):
        left = self.litres - n
        if left < 0:
            left = 0
        self.litres = left

    def is_dry(self):
        return self.litres == 0
