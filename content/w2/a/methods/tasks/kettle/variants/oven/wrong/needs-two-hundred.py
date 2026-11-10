class Oven:
    def __init__(self, heat):
        self.heat = heat

    def is_ready(self):
        return self.heat >= 200


def can_bake(oven):
    return oven.is_ready()
