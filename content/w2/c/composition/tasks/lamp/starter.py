class Battery:
    def __init__(self, charge):
        self.charge = charge

    def drain(self):
        self.charge -= 1


class Lamp:
    def __init__(self, charge):
        self.battery = Battery(charge)

    def shine(self):
        # "dark" when the battery is empty, otherwise drain it once and give "light"
        pass
