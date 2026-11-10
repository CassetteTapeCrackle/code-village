class Pebble:
    def __init__(self, size):
        self.size = size

    def __lt__(self, other):
        return other.size > self.size
