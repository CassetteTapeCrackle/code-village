class Torch:
    def __init__(self, battery):
        self.battery = battery

    def use(self, minutes):
        self.battery = self.battery - minutes
        if self.battery < 0:
            self.battery = 0

    def is_empty(self):
        return self.battery > 0
