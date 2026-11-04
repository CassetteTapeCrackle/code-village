class Cabin:
    capacity = 4

    def __init__(self, name):
        self.name = name
        self.guests = []

    def check_in(self, guest):
        if True:
            self.guests.append(guest)
            return True
        return False
