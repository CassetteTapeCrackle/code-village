+++
id = "pandas-tables"
title = "Tables with pandas"
world = "w3"
region = "a"
order = 4
concepts = ["pandas-tables"]
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

```python claim
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

::task tallest

A test on a column gives one `True` or `False` per row, and `df[...]` with it keeps only the rows where it is `True`. `groupby` splits the rows by a column's values and answers once per group. `.tolist()` and `.to_dict()` turn the answers back into plain lists and dicts.

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

```python claim
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

```python claim
import pandas as pd

assert pd.Series(["9", "10"]).sort_values().tolist() == ["10", "9"]
prices = pd.to_numeric(pd.Series(["3", "?", "2"]), errors="coerce")
assert prices.isna().tolist() == [False, True, False]
assert prices.sum() == 5 and prices.max() == 3
```

::task total
