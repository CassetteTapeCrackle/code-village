+++
id = "statistics"
title = "Mean, median and spread"
world = "w3"
region = "b"
order = 6
concepts = ["statistics"]
remember = ["The mean is the sum divided by the count; the median is the middle value once sorted (with an even count, the mean of the two middle ones).", "The range (max minus min) and the standard deviation say how spread out the values are.", "np.std(x, ddof=0) treats the values as everything there is; ddof=1 as a sample. pandas uses ddof=1 unless told otherwise, so always write ddof.", "One huge value drags the mean but hardly moves the median: use the median for a typical value."]
[loot]
id = "weather-vane"
name = "Weather Vane"
+++

A few numbers sum up a list of measurements: where its middle is, and how spread out it is. First by hand. The **mean** is the sum divided by the count. The **median** is the middle value once the list is sorted.

```python example
temps = [12, 15, 11, 14, 13]
mean = sum(temps) / len(temps)
middle = sorted(temps)[len(temps) // 2]
print(mean, middle)
```

With an even number of values there are two middle values, and the median is their mean: the median of `[1, 2, 3, 4]` is `2.5`.

```python claim
import numpy as np

assert float(np.median([1, 2, 3, 4])) == 2.5 and float(np.median([3, 1, 2])) == 2.0
```

::task median

The **range** (largest minus smallest) is the simplest spread. The **standard deviation** is the usual one: roughly, how far a typical value sits from the mean. NumPy has all of these. `np.std` takes a `ddof` that changes the answer a little: `ddof=0` when your values are everything there is, `ddof=1` when they are a sample of something bigger. pandas uses `ddof=1` unless you say otherwise, so in this course we always write it.

```python claim
import math
import numpy as np
import pandas as pd

temps = [12, 15, 11, 14, 13]
mean = sum(temps) / len(temps)
assert math.isclose(float(np.std(temps, ddof=0)), math.sqrt(sum((t - mean) ** 2 for t in temps) / len(temps)))
assert math.isclose(float(np.std(temps, ddof=1)), math.sqrt(sum((t - mean) ** 2 for t in temps) / (len(temps) - 1)))
assert np.std(temps) == np.std(temps, ddof=0)
assert pd.Series(temps).std() == pd.Series(temps).std(ddof=1)
```

```python example
import numpy as np

temps = np.array([12, 15, 11, 14, 13])
print(float(temps.max() - temps.min()))
print(float(np.mean(temps)), float(np.median(temps)))
print(round(float(np.std(temps, ddof=0)), 2), round(float(np.std(temps, ddof=1)), 2))
```

A pandas column has the same methods, so a table's columns are summed up the same way:

```python example
import pandas as pd

s = pd.Series([12, 15, 11, 14, 13])
print(float(s.mean()), float(s.median()), round(float(s.std(ddof=0)), 2))
```

::task summary

The mean uses every value, so a single huge one drags it far away. The median only looks at the middle, so it hardly moves.

```python predict
import numpy as np

pay = np.array([20, 22, 21, 23, 200])
print(float(np.mean(pay)), float(np.median(pay)))
```

For "what is typical here?", the median is usually the better answer.

::task typical
