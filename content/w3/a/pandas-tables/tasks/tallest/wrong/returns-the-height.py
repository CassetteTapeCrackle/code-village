import io
import pandas as pd


def tallest(text):
    df = pd.read_csv(io.StringIO(text))
    return df.sort_values("height").iloc[-1]["height"]
