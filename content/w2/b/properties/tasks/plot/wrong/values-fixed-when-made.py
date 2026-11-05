class Plot:
    def __init__(self, width, depth):
        self.width = width
        self.depth = depth
        self.area = width * depth
        self.fence = 2 * (width + depth)
