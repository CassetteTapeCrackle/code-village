import io
import pandas as pd


def total_price(text):
    df = pd.read_csv(io.StringIO(text))
    return float(pd.to_numeric(df["price"], errors="coerce").max())
