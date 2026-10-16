ROOMS = {
    "gate": {"description": "A broken gate. A path leads north.", "exits": {"north": "hall"}, "items": []},
    "hall": {"description": "A hall of fallen pillars. Exits: south, east.", "exits": {"south": "gate", "east": "vault"}, "items": ["lamp"]},
    "vault": {"description": "A quiet vault. Your satchel lies here!", "exits": {"west": "hall"}, "items": ["satchel"]},
}


def parse(command):
    pass


def move(rooms, here, direction):
    pass


def take(rooms, here, item, satchel):
    pass


def play():
    pass


if __name__ == "__main__":
    play()
