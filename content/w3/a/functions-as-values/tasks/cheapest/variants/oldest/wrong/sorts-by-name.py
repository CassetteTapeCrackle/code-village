def age(person):
    return person[0]


def oldest_first(people):
    return sorted(people, key=age, reverse=True)
