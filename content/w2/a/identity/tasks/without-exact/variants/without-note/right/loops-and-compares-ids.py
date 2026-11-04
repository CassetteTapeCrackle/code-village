def without_note(notes, note):
    out = []
    for n in notes:
        if id(n) != id(note):
            out.append(n)
    return out
