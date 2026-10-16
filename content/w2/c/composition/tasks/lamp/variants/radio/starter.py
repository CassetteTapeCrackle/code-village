class Battery:
    def __init__(self, charge):
        self.charge = charge

    def drain(self):
        self.charge -= 1


class Radio:
    def __init__(self, charge):
        self.battery = Battery(charge)

    def play(self):
        # "silence" when empty, otherwise drain once and give "music"
        pass
