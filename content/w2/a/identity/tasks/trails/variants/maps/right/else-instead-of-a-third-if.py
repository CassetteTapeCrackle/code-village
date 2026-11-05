class Map:
    def __init__(self, region):
        self.region = region


def compare_maps(a, b):
    if a is b:
        return "same map"
    elif a.region == b.region:
        return "copies"
    else:
        return "different"
