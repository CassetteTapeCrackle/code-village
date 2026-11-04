def save_lines(path, lines):
    with open(path, "w") as f:
        for line in lines[:1]:
            f.write(line + "\n")
