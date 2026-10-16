class Battery:
    def __init__(self, charge):
        self.charge = charge

    def drain(self):
        self.charge -= 1


class Lamp:
    def __init__(self, charge):
        self.battery = Battery(charge)

    def shine(self):
        if self.battery.charge == 0:
            return "dark"
        self.battery.drain()
        return "light"
