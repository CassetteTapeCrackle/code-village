import io
import pandas as pd


def cheapest(text):
    df = pd.read_csv(io.StringIO(text))
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    return df.sort_values("price").iloc[-1]["item"]
