+++
id = "squirrel-storehouse"
title = "The Squirrel Storehouse"
world = "w2"
region = "a"
hard_checks = 5
[trophy]
id = "squirrel-scale"
name = "Squirrel Scale"
[hard_trophy]
id = "golden-acorn"
name = "Golden Acorn"

[cases]
class = "Inventory"
init = ["word", "int 0..50", "int 1..20"]
methods = { sell = ["int 1..30"], restock = ["int 1..30"], value = [] }
reads = ["stock", "sales", "revenue"]
+++

The squirrels of the hollow oak run a storehouse, and their books are a mess. Write an `Inventory` class that keeps one product's stock, sales and takings straight.

Three stages: make the inventory, sell from it, then restock it and say what the stock is worth. Hard mode starts from an empty page.
