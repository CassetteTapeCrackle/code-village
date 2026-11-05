class Badge:
    def __init__(self, owner):
        self.owner = owner

    def __str__(self):
        print(f"Badge of {self.owner}")
