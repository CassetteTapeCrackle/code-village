class Map:
    def __init__(self, region):
        self.region = region


def compare_maps(a, b):
    if id(a) == id(b):
        return "same map"
    if a.region == b.region:
        return "copies"
    return "different"
