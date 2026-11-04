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

```python claim id=auto-c80470d411af
import statistics
v = [1, 2, 3, 4]
assert statistics.mean(v) == sum(v) / len(v) == 2.5
```

```python example
temps = [12, 15, 11, 14, 13]
mean = sum(temps) / len(temps)
middle = sorted(temps)[len(temps) // 2]
print(mean, middle)
```

With an even number of values there are two middle values, and the median is their mean: the median of `[1, 2, 3, 4]` is `2.5`.

```python claim id=auto-e0c134df751c
import statistics
assert statistics.median([1, 2, 3, 4]) == 2.5
```

```python claim id=statistics-claim-1
import numpy as np

assert float(np.median([1, 2, 3, 4])) == 2.5 and float(np.median([3, 1, 2])) == 2.0
```

::task median

The **range** (largest minus smallest) is the simplest spread. The **standard deviation** is the usual one: roughly, how far a typical value sits from the mean. NumPy has all of these. `np.std` takes a `ddof` that changes the answer a little: `ddof=0` when your values are everything there is, `ddof=1` when they are a sample of something bigger. pandas uses `ddof=1` unless you say otherwise, so in this course we always write it.

```python claim id=auto-f9cdb4120fb7
import numpy as np
import pandas as pd
x = [1, 2, 3, 4]
s = pd.Series(x)
assert s.std() == s.std(ddof=1)
assert abs(s.std() - np.std(x, ddof=1)) < 1e-12
assert s.std() != np.std(x)
```

```python claim id=auto-2cb4ad90700c
import numpy as np
x = [1, 2, 3, 4]
a = np.std(x, ddof=0)
b = np.std(x, ddof=1)
assert abs(a - (1.25 ** 0.5)) < 1e-12
assert abs(b - ((5 / 3) ** 0.5)) < 1e-12
assert a != b
```

```python claim id=auto-d36ea8d902e0
import numpy as np
x = [1, 2, 3, 4]
assert np.ptp(x) == 3
assert np.std(x, ddof=0) > 0
assert np.mean(x) == 2.5
assert np.median(x) == 2.5
```

```python claim id=statistics-claim-2
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

```python claim id=auto-8cc05159ad45
import pandas as pd
df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 9]})
assert df['a'].mean() == 2
assert df['b'].median() == 5
assert df.mean().to_dict() == {'a': 2.0, 'b': 6.0}
assert df.max().to_dict() == {'a': 3, 'b': 9}
assert df.std(ddof=0).shape == (2,)
```

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

```python claim id=auto-155099203b04
s = [1, 2, 3, 4]
mid = len(s) // 2
assert (s[mid - 1], s[mid]) == (2, 3)
assert (s[mid - 1] + s[mid]) / 2 == 2.5
```

```python claim id=auto-ea952e762ac1
import numpy as np
assert np.std([2, 4, 4, 4, 5, 5, 7, 9], ddof=0) == 2.0
```

```python claim id=auto-f14d37ef996b
import numpy as np
r = np.median([3, 4, 90])
assert r == 4.0
assert isinstance(r, float)
```

```python claim id=auto-3717221d8d28
import statistics
x = [4, 1, 3, 2]
assert sum(x) / len(x) == statistics.mean(x) == 2.5
s = sorted(x)
assert (s[1] + s[2]) / 2 == statistics.median(x) == 2.5
y = [5, 1, 3]
assert sorted(y)[1] == statistics.median(y)
```

```python claim id=auto-47c67956233f
import numpy as np
import statistics
x = [1, 2, 4, 8]
assert abs(np.std(x, ddof=0) - statistics.pstdev(x)) < 1e-12
assert abs(np.std(x, ddof=1) - statistics.stdev(x)) < 1e-12
```

```python claim id=auto-d97c11b644ac
import pandas as pd
import numpy as np
x = [1, 2, 4, 8]
assert abs(pd.Series(x).std() - np.std(x, ddof=1)) < 1e-12
assert pd.Series(x).std() != np.std(x)
```
