import io
import pandas as pd


def cheapest(text):
    df = pd.read_csv(io.StringIO(text))
    return df.sort_values("price").iloc[0]["item"]
