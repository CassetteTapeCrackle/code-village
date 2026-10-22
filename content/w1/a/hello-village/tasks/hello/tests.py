PROGRAM = True

def greeting():
    lines = run_program().splitlines()
    if len(lines) != 1:
        raise Failure("Print one line, like Hello Mochi!")
    return lines[0].strip()

def name_after_hello(line):
    if not line.lower().startswith("hello"):
        raise Failure('The line should start with "Hello ".')
    rest = line[len("Hello"):]
    if rest and rest[0] not in " ,!":
        raise Failure('The line should start with "Hello ".')
    rest = rest.lstrip(" ,")
    if rest.endswith("!"):
        rest = rest[:-1]
    return rest.strip()

def test_one_line():
    """one line of output"""
    greeting()

def test_your_name():
    """Hello with your name"""
    name = name_after_hello(greeting())
    if name.casefold() == "name":
        raise Failure("Replace NAME with your own name")
    if not name:
        raise Failure("Put your name between Hello and !")
