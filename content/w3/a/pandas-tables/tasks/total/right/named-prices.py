import io
import pandas as pd


def total_price(text):
    df = pd.read_csv(io.StringIO(text))
    prices = pd.to_numeric(df["price"], errors="coerce")
    return float(prices.sum())
