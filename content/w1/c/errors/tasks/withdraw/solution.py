def withdraw(balance, amount):
    if amount > balance:
        raise ValueError("not enough money")
    return balance - amount
