def hint(secret, guess):
    if guess < secret:
        return "higher"
    if guess > secret:
        return "lower"
    return "correct"


def digits_of(text):
    digits = ""
    seen = False
    ended = False
    for c in text:
        if c == " ":
            if seen:
                ended = True
            continue
        if ended:
            return None
        if c not in "0123456789":
            return None
        digits = digits + c
        seen = True
    if not seen:
        return None
    return digits


def read_guess(text):
    digits = digits_of(text)
    if digits is None:
        return None
    number = 0
    for d in digits:
        number = number * 10 + int(d)
    if number < 1 or number > 100:
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
