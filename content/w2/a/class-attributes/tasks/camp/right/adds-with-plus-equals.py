class Camp:
    def __init__(self, name):
        self.name = name
        self.tents = []

    def add_tent(self, tent):
        self.tents += [tent]
