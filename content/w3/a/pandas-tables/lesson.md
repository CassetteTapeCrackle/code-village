+++
id = "pandas-tables"
title = "Tables with pandas"
world = "w3"
region = "a"
order = 4
concepts = ["pandas-tables"]
teaches = ["array-reductions", "io-stringio", "numpy-arrays", "numpy-statistics", "pandas-basics", "pandas-conversions", "pandas-groupby", "pandas-sort-values"]
remember = ["pd.read_csv(io.StringIO(text)) turns CSV text into a table (a DataFrame); io.StringIO makes text behave like a file.", "df[\"col\"] is one column; df[df[\"col\"] > 3] keeps the rows where the test holds; .tolist() gives a plain list.", "df.groupby(\"team\")[\"col\"].max() answers once per group.", "One bad value (like ?) makes pandas read the whole column as text: + then joins instead of adding. pd.to_numeric(col, errors=\"coerce\") turns it back into numbers."]
[loot]
id = "survey-ledger"
name = "Survey Ledger"
+++

A table of data often arrives as **CSV** text: one row per line, values split by commas, names on the first line. You can read it by hand with what you know already:

```python example
text = "name,height\nNoa,160\nSam,172\nLou,155"
rows = [line.split(",") for line in text.splitlines()[1:]]
heights = [int(h) for name, h in rows]
print(max(heights), round(sum(heights) / len(heights), 1))
```

**pandas** does this in one line, and much more after it. `pd.read_csv` reads a file into a table called a **DataFrame**; `io.StringIO(text)` makes our text behave like a file, so we can keep the data right in the code. Each number column is read as numbers.

```python claim id=auto-163f2cf02697
import io
import pandas as pd
df = pd.read_csv(io.StringIO('name,h\na,1\nb,2.5\n'))
assert pd.api.types.is_numeric_dtype(df['h'])
assert df['h'].sum() == 3.5
```

```python claim id=auto-43da8aade720
import io
import pandas as pd
df = pd.read_csv(io.StringIO('a,b\n1,2\n3,4'))
assert isinstance(df, pd.DataFrame)
assert df['a'].tolist() == [1, 3]
```

```python claim id=pandas-tables-claim-1
import io
import pandas as pd

df = pd.read_csv(io.StringIO("name,height\nNoa,160\nSam,172"))
assert pd.api.types.is_integer_dtype(df["height"])
assert not pd.api.types.is_numeric_dtype(df["name"])
```

```python example
import io
import pandas as pd

text = "name,height\nNoa,160\nSam,172\nLou,155"
df = pd.read_csv(io.StringIO(text))
print(df)
print(df["height"].max(), df["height"].mean().round(1))
print(df.sort_values("height").iloc[-1]["name"])
```

The numbers down the left are the row labels. `df["height"]` is one column, and it has its own `max`, `min`, `mean` and `sum`. `sort_values("height")` sorts the rows by that column, smallest first; `.iloc[0]` is then the first row and `.iloc[-1]` the last, and `["name"]` reads one value from that row.

```python claim id=auto-1d446e026a9a
import io
import pandas as pd
df = pd.read_csv(io.StringIO('name,height\na,5\nb,1\nc,3\n'))
s = df.sort_values('height')
assert s.iloc[0]['name'] == 'b'
assert s.iloc[-1]['name'] == 'a'
```

```python claim id=auto-5a3646cdc7d7
import io
import pandas as pd
df = pd.read_csv(io.StringIO('name,height\na,1\nb,3\n'))
c = df['height']
assert (c.max(), c.min(), c.mean(), c.sum()) == (3, 1, 2.0, 4)
```

```python claim id=auto-7341dd4f3b0a
import io
import pandas as pd
df = pd.read_csv(io.StringIO('name,h\na,1\nb,2\n'))
assert list(df.index) == [0, 1]
assert 'name' not in df.index
```

::task tallest

A test on a column gives one `True` or `False` per row, and `df[...]` with it keeps only the rows where it is `True`. `groupby` splits the rows by a column's values and answers once per group. `.tolist()` and `.to_dict()` turn the answers back into plain lists and dicts.

```python claim id=auto-68c5a0f5c907
import pandas as pd
s = pd.Series([1, 2], index=['a', 'b'])
assert s.tolist() == [1, 2] and type(s.tolist()) is list
assert s.to_dict() == {'a': 1, 'b': 2} and type(s.to_dict()) is dict
```

```python claim id=auto-d44124d1147c
import pandas as pd
df = pd.DataFrame({'t': ['x', 'y', 'x'], 'h': [1, 2, 3]})
r = df.groupby('t')['h'].max()
assert r.to_dict() == {'x': 3, 'y': 2}
```

```python claim id=auto-a4e34daeec91
import pandas as pd
df = pd.DataFrame({'a': [1, 5, 7]})
mask = df['a'] > 3
assert mask.tolist() == [False, True, True]
assert df[mask]['a'].tolist() == [5, 7]
```

```python example
import io
import pandas as pd

df = pd.read_csv(io.StringIO("name,height,team\nNoa,160,red\nSam,172,blue\nLou,155,red"))
tall = df[df["height"] > 158]
print(tall["name"].tolist())
print(df.groupby("team")["height"].max().to_dict())
```

::task team

pandas reads a column as numbers only when every value in it looks like a number (an empty cell is fine: it becomes `NaN`, "not a number"). One odd value, like a `?`, and the whole column is read as text.

```python claim id=auto-7fa5822f7f32
import io
import pandas as pd
b = pd.read_csv(io.StringIO('n,p\na,1\nb,?\nc,3\n'))
assert not pd.api.types.is_numeric_dtype(b['p'])
assert b['p'].tolist() == ['1', '?', '3']
```

```python claim id=auto-acbc8ff25623
import io
import pandas as pd
a = pd.read_csv(io.StringIO('n,p\na,1\nb,\nc,3\n'))
assert pd.api.types.is_numeric_dtype(a['p'])
assert a['p'].isna().tolist() == [False, True, False]
b = pd.read_csv(io.StringIO('n,p\na,1\nb,?\nc,3\n'))
assert not pd.api.types.is_numeric_dtype(b['p'])
```

```python claim id=pandas-tables-claim-2
import io
import pandas as pd

blank = pd.read_csv(io.StringIO("item,price\ntea,3\njam,\nbun,2"))
assert pd.api.types.is_numeric_dtype(blank["price"])
assert blank["price"].isna().tolist() == [False, True, False]
odd = pd.read_csv(io.StringIO("item,price\ntea,3\njam,?\nbun,2"))
assert not pd.api.types.is_numeric_dtype(odd["price"])
```

```python predict
import io
import pandas as pd

df = pd.read_csv(io.StringIO("item,price\ntea,3\njam,?\nbun,2"))
print(df["price"].tolist())
print(df["price"].sum())
```

On text, `sum` joins the strings, and sorting puts `"10"` before `"9"`. `pd.to_numeric(df["price"], errors="coerce")` turns the column back into numbers, with `NaN` for whatever was not one. `sum` and `max` skip the `NaN`s.

```python claim id=auto-938efd2cc34a
import pandas as pd
import numpy as np
s = pd.Series([3.0, np.nan, 2.0])
assert s.sum() == 5.0
assert s.max() == 3.0
```

```python claim id=auto-75ca777186be
import pandas as pd
s = pd.to_numeric(pd.Series(['3', '?', '2']), errors='coerce')
assert pd.api.types.is_numeric_dtype(s)
assert s.isna().tolist() == [False, True, False]
assert s.sum() == 5
```

```python claim id=auto-bc48e92a4245
import io
import pandas as pd
b = pd.read_csv(io.StringIO('n,p\na,3\nb,?\nc,2\n'))
assert b['p'].astype(object).sum() == '3?2'
assert sorted(['9', '10']) == ['10', '9']
d = pd.DataFrame({'p': ['9', '10']}).sort_values('p')
assert d['p'].tolist() == ['10', '9']
```

```python claim id=pandas-tables-claim-3
import pandas as pd

assert pd.Series(["9", "10"]).sort_values().tolist() == ["10", "9"]
prices = pd.to_numeric(pd.Series(["3", "?", "2"]), errors="coerce")
assert prices.isna().tolist() == [False, True, False]
assert prices.sum() == 5 and prices.max() == 3
```

::task total

```python claim id=auto-e3b71f37edae
import pandas as pd
s = pd.to_numeric(pd.Series(['3', '?', '2']), errors='coerce')
assert s.isna().tolist() == [False, True, False]
assert s.sum() == 5
```

```python claim id=auto-22f03a34c912
import io
import pandas as pd
df = pd.read_csv(io.StringIO('a,b\n1,2\n'))
assert isinstance(df, pd.DataFrame)
assert df['a'].tolist() == [1]
```

```python claim id=auto-3736bc4efcff
import pandas as pd
df = pd.DataFrame({'col': [1, 5, 7]})
assert isinstance(df['col'], pd.Series)
r = df[df['col'] > 3]['col'].tolist()
assert r == [5, 7] and type(r) is list
```

```python claim id=auto-266caeeb6fb2
import pandas as pd
df = pd.DataFrame({'team': ['a', 'b', 'a'], 'col': [1, 2, 3]})
r = df.groupby('team')['col'].max()
assert len(r) == 2
assert r['a'] == 3 and r['b'] == 2
```

```python claim id=auto-51b87d21f938
import io
import pandas as pd
df = pd.read_csv(io.StringIO('p\n3\n?\n2\n'))
assert not pd.api.types.is_numeric_dtype(df['p'])
assert df['p'].iloc[0] + df['p'].iloc[2] == '32'
assert df['p'].astype(object).sum() == '3?2'
```

```python claim id=auto-a043bff6f417
import io
import pandas as pd
df = pd.read_csv(io.StringIO('p\n3\n?\n2\n'))
s = pd.to_numeric(df['p'], errors='coerce')
assert pd.api.types.is_numeric_dtype(s)
assert s.sum() == 5
```
