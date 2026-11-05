PROGRAM = True

GATE = "A broken gate. A path leads north.\n"
HALL = "A hall of fallen pillars. Exits: south, east.\n"
VAULT = "A quiet vault. Your satchel lies here!\n"

def test_win():
    out = run_program(["go north", "take lamp", "go east", "take satchel"])
    expect_equal(out, GATE + HALL + "Taken: lamp\n" + VAULT + "Taken: satchel\nYou found the lost satchel. Well done!\n")

def test_confusion():
    out = run_program(["dance", "go west", "inventory", "quit"])
    expect_equal(out, GATE + "I don't understand.\nYou can't go that way.\nSatchel: (empty)\nBye!\n")

def test_look_and_missing_item():
    out = run_program(["go north", "look", "take sword", "quit"])
    expect_equal(out, GATE + HALL + HALL + "You see: lamp\nThere is no sword here.\nBye!\n")

def test_back_inventory_and_unknown_verbs():
    out = run_program(["go north", "take lamp", "inventory", "go south", "open door", "xyzzy", "quit"])
    expect_equal(out, GATE + HALL + "Taken: lamp\nSatchel: lamp\n" + GATE + "I don't understand.\nI don't understand.\nBye!\n")
