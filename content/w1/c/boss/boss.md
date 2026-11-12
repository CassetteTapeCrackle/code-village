+++
id = "lost-satchel"
title = "The Lost Satchel"
world = "w1"
region = "c"
hard_checks = 5
[trophy]
id = "ruin-lantern"
name = "Ruin Lantern"
[hard_trophy]
id = "cartographers-quill"
name = "Cartographer's Quill"
[cases]
stdin = ["choice look|inventory|dance|open|quit", "choice look|inventory|dance|open|quit", "choice look|inventory|dance|open|quit", "choice look|inventory|dance|open|quit", "choice look|inventory|dance|open|quit", "choice look|inventory|dance|open|quit", "choice look|inventory|dance|open|quit", "choice look|inventory|dance|open|quit", "choice look|inventory|dance|open|quit", "choice look|inventory|dance|open|quit", "choice look|inventory|dance|open|quit", "choice look|inventory|dance|open|quit"]
+++

You left your satchel somewhere in the ruins. Write a tiny text adventure to go and get it back: rooms are a dict of dicts, commands come from `input()`, and what you pick up goes into a list.

The rooms are given in `ROOMS`. Each room has a `description`, its `exits` (a dict from direction to room name) and its `items` (a list). Four stages: read a command, move, pick things up, then the whole game.

Hard mode starts from an empty page, so here is the map to copy:

```
ROOMS = {
    "gate": {"description": "A broken gate. A path leads north.", "exits": {"north": "hall"}, "items": []},
    "hall": {"description": "A hall of fallen pillars. Exits: south, east.", "exits": {"south": "gate", "east": "vault"}, "items": ["lamp"]},
    "vault": {"description": "A quiet vault. Your satchel lies here!", "exits": {"west": "hall"}, "items": ["satchel"]},
}
```
