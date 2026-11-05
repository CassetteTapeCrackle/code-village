def without_note(notes, note):
    out = []
    skipped = False
    for n in notes:
        if not skipped and n == note:
            skipped = True
        else:
            out.append(n)
    return out
