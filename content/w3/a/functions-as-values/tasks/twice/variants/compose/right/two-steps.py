def compose(f, g, x):
    result = g(x)
    return f(result)
