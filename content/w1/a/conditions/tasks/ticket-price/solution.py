def ticket_price(age):
    if age < 4:
        return 0
    elif age < 18:
        return 5
    elif age < 65:
        return 9
    else:
        return 6
