class Badge:
    def __init__(self, owner):
        self.owner = owner

    def __str__(self):
        return "Badge of " + self.owner
