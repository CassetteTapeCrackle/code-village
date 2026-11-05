class Camp:
    tents = []

    def __init__(self, name):
        self.name = name

    def add_tent(self, tent):
        self.tents.append(tent)
