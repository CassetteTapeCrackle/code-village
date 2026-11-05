ROOMS = {
    "gate": {"description": "A broken gate. A path leads north.", "exits": {"north": "hall"}, "items": []},
    "hall": {"description": "A hall of fallen pillars. Exits: south, east.", "exits": {"south": "gate", "east": "vault"}, "items": ["lamp"]},
    "vault": {"description": "A quiet vault. Your satchel lies here!", "exits": {"west": "hall"}, "items": ["satchel"]},
}


def join_words(words, gap):
    text = ""
    for word in words:
        if text != "":
            text = text + gap
        text = text + word
    return text


def parse(command):
    words = command.lower().split()
    if not words:
        return "", ""
    noun = ""
    for word in words[1:]:
        if noun != "":
            noun = noun + " "
        noun = noun + word
    return words[0], noun


def move(rooms, here, direction):
    return rooms[here]["exits"].get(direction, here)


def take(rooms, here, item, satchel):
    items = rooms[here]["items"]
    if item not in items:
        return False
    kept = []
    for thing in items:
        if thing != item:
            kept.append(thing)
    rooms[here]["items"] = kept
    satchel.append(item)
    return True


def play():
    here = "gate"
    satchel = []
    print(ROOMS[here]["description"])
    while True:
        verb, noun = parse(input())
        if verb == "quit":
            print("Bye!")
            return
        if verb == "look":
            print(ROOMS[here]["description"])
            if ROOMS[here]["items"]:
                print("You see: " + join_words(ROOMS[here]["items"], ", "))
        elif verb == "go":
            new = move(ROOMS, here, noun)
            if new == here:
                print("You can't go that way.")
            else:
                here = new
                print(ROOMS[here]["description"])
        elif verb == "take":
            if take(ROOMS, here, noun, satchel):
                print("Taken: " + noun)
                if noun == "satchel":
                    print("You found the lost satchel. Well done!")
                    return
            else:
                print(f"There is no {noun} here.")
        elif verb == "inventory":
            if satchel:
                print("Satchel: " + join_words(satchel, ", "))
            else:
                print("Satchel: (empty)")
        else:
            print("I don't understand.")


if __name__ == "__main__":
    play()
