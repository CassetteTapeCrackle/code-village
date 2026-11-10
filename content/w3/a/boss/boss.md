+++
id = "sales-report"
title = "The Sales Report"
world = "w3"
region = "a"
hard_checks = 5
[trophy]
id = "mine-lamp"
name = "Miner's Lamp"
[hard_trophy]
id = "gold-nugget"
name = "Gold Nugget"

[cases]
none = "every stage takes CSV text, sale dicts or a file path, which a case cannot build"
+++

The old mine's shop sells lamps, ropes and picks to climbers, and writes every sale on a slip of CSV. Turn the slips into a report the miners can keep.

Three stages: read the sales, total them per product, then save the report as JSON and read it back. Hard mode starts from an empty page.
