def save_scores(path, scores):
    for s in scores:
        with open(path, "w") as f:
            f.write(str(s) + "\n")
