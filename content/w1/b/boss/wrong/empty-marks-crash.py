def parse_line(line):
    name, _, rest = line.partition(":")
    marks = [int(m) for m in rest.split(",") if m.strip()]
    return name.strip(), marks


def average(marks):
    total = 0
    for mark in marks:
        total = total + mark
    return round(total / len(marks), 2)


def ranking(lines):
    rows = [parse_line(line) for line in lines if line.strip()]
    pairs = [(name, average(marks)) for name, marks in rows]
    ordered = []
    while pairs:
        best = pairs[0]
        for pair in pairs:
            if pair[1] > best[1]:
                best = pair
            elif pair[1] == best[1] and pair[0] < best[0]:
                best = pair
        ordered.append(best)
        pairs.remove(best)
    return ordered
