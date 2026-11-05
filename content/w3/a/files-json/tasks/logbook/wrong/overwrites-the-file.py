def add_entry(path, text):
    with open(path, "w") as f:
        f.write(text + "\n")
