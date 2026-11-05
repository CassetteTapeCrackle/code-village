def withdraw(balance, amount):
    if balance < amount:
        raise ValueError("not enough money")
    return balance - amount
