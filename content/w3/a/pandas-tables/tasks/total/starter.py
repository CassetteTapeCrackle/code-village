import io
import pandas as pd


def total_price(text):
    df = pd.read_csv(io.StringIO(text))
    return df["price"].sum()
