def count_lines(path):
    with open(path) as f:
        count = 0
        for _ in f:
            count += 1
        return count
