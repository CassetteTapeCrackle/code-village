def save_lines(path, lines):
    with open(path, "w") as f:
        for line in lines:
            f.write(line + "\n")
