class Kettle:
    def __init__(self, temperature):
        self.temperature = temperature

    def is_hot(self):
        return self.temperature >= 90


def ready(kettle):
    if kettle.is_hot():
        return True
    return False
