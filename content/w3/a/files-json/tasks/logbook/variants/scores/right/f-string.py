def save_scores(path, scores):
    with open(path, "w") as f:
        for s in scores:
            f.write(f"{s}\n")
