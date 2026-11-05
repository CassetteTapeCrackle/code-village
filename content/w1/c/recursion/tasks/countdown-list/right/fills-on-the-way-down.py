def countdown_list(n):
    result = []
    fill(n, result)
    return result


def fill(n, result):
    if n == 0:
        return
    result.append(n)
    fill(n - 1, result)
