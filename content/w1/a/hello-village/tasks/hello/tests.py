PROGRAM = True

def greeting():
    lines = run_program().splitlines()
    if len(lines) != 1:
        raise Failure("Print one line, like Hello Mochi!")
    return lines[0].strip()

def test_one_line():
    """one line of output"""
    greeting()

def test_your_name():
    """Hello with your name"""
    line = greeting()
    if not line.startswith("Hello "):
        raise Failure('The line should start with "Hello ".')
    if not line.endswith("!"):
        raise Failure('The line should end with "!".')
    name = line[len("Hello "):-1].strip()
    if name == "NAME":
        raise Failure("Replace NAME with your own name")
    if not name:
        raise Failure("Put your name between Hello and !")
