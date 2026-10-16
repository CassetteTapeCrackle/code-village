class Bird:
    def __init__(self, name):
        self.name = name

    def move(self):
        return f"{self.name} flies"


class Ostrich(Bird):
    def move(self):
        # ostriches do not fly
        pass
