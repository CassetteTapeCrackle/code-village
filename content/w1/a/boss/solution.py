def hint(secret, guess):
    if guess < secret:
        return "higher"
    if guess > secret:
        return "lower"
    return "correct"


def read_guess(text):
    text = text.strip()
    if not text.isdecimal():
        return None
    number = int(text)
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
