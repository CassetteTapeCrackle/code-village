def parse_line(line):
    name, _, rest = line.partition(":")
    marks = [int(m) for m in rest.split(",") if m.strip()]
    return name.strip(), marks


def average(marks):
    if not marks:
        return 0.0
    return round(sum(marks) / len(marks), 2)


def ranking(lines):
    rows = [parse_line(line) for line in lines if line.strip()]
    pairs = [(name, average(marks)) for name, marks in rows]
    return sorted(pairs, key=lambda pair: (-pair[1], pair[0]))
