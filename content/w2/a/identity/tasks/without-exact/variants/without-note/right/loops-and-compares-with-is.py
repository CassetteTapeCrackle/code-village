def without_note(notes, note):
    out = []
    for n in notes:
        if n is not note:
            out.append(n)
    return out
