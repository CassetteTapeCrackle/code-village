class Cabin:
    capacity = 4

    def __init__(self, name):
        self.name = name
        self.guests = []

    def check_in(self, guest):
        if len(self.guests) < self.capacity:
            self.guests += [guest]
            return True
        return False
