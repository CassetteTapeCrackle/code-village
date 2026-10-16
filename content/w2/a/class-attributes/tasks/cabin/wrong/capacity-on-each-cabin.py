class Cabin:
    def __init__(self, name):
        self.name = name
        self.guests = []
        self.capacity = 4

    def check_in(self, guest):
        if len(self.guests) < self.capacity:
            self.guests.append(guest)
            return True
        return False
