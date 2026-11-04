class Oven:
    def __init__(self, heat):
        self.heat = heat

    def is_ready(self):
        return self.heat >= 180


def can_bake(oven):
    return True
