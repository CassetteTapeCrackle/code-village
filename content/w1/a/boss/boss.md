+++
id = "guessing-stone"
title = "The Guessing Stone"
world = "w1"
region = "a"
hard_checks = 5
[trophy]
id = "quarry-key"
name = "Quarry Key"
[hard_trophy]
id = "carved-dice"
name = "Carved Dice"
[cases]
stdin = ["int 1..100", "int 1..100", "int 1..100", "int 1..100", "int 1..100", "int 1..100", "int 1..100"]
+++

Deep in the quarry sits a stone that thinks of a number from 1 to 100 and gives you five guesses. Write the game it plays.

Your program has three functions. The last lines, under `if __name__ == "__main__":`, start the game only when the whole program runs; the first two stages check your functions on their own. To make testing possible, the stone's secret number is the first line the program reads. In a real game you would let Python pick it: `import random`, then `random.randint(1, 100)` gives a whole number from 1 to 100.
