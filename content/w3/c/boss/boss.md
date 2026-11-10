+++
id = "star-classifier"
title = "The Star Classifier"
world = "w3"
region = "c"
hard_checks = 5
[trophy]
id = "star-crown"
name = "Star Crown"
[hard_trophy]
id = "comet-shard"
name = "Comet Shard"
[cases]
call = "scale_columns"
args = ["list<list<int 0..9> 2..2> 2..6"]
+++

At the peak, the night is clear and the stars are many. Each one in the catalogue has a temperature (in kelvin) and a brightness, and Alex has labelled some: dwarf, sunlike or giant. Teach a program to label the rest.

Four stages: scale the features, find the nearest star by hand, let scikit-learn vote, then prove the model works on stars it has never seen. Hard mode starts from an empty page.
