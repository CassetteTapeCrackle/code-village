class Notebook:
    def __init__(self):
        self.lines = []

    def write(self, line):
        self.lines.append(line)

    def write_lines(self, lines):
        for line in lines:
            self.write(line)
