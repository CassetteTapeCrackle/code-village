def without_note(notes, note):
    result = []
    skipped = False
    for n in notes:
        if not skipped and n == note:
            skipped = True
        else:
            result.append(n)
    return result
