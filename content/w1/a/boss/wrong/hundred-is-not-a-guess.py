def hint(secret, guess):
    if guess < secret:
        return "higher"
    if guess > secret:
        return "lower"
    return "correct"


def read_guess(text):
    number = 0
    seen = False
    ended = False
    for c in text:
        if c == " ":
            if seen:
                ended = True
            continue
        if c not in "0123456789":
            return None
        if ended:
            return None
        number = number * 10 + int(c)
        seen = True
    if not seen:
        return None
    if number < 1 or number >= 100:
        return None
    return number


def play(secret):
    used = 0
    while used < 5:
        guess = read_guess(input())
        if guess is None:
            print("Please type a whole number from 1 to 100.")
            continue
        used = used + 1
        result = hint(secret, guess)
        if result == "correct":
            print(f"Correct! Guesses used: {used}")
            return
        print(result)
    print(f"Out of guesses. It was {secret}.")


if __name__ == "__main__":
    play(int(input()))
