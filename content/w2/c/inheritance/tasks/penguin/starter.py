class Bird:
    def __init__(self, name):
        self.name = name

    def move(self):
        return f"{self.name} flies"


class Penguin(Bird):
    def move(self):
        # penguins do not fly
        pass
