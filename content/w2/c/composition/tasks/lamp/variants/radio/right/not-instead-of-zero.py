class Battery:
    def __init__(self, charge):
        self.charge = charge

    def drain(self):
        self.charge -= 1


class Radio:
    def __init__(self, charge):
        self.battery = Battery(charge)

    def play(self):
        if not self.battery.charge:
            return "silence"
        self.battery.drain()
        return "music"
