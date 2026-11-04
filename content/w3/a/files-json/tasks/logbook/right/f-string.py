def add_entry(path, text):
    with open(path, "a") as f:
        f.write(f"{text}\n")
