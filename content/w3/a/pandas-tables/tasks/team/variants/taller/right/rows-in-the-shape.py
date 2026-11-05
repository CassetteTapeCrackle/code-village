import io
import pandas as pd


def count_taller(text, h):
    df = pd.read_csv(io.StringIO(text))
    return df[df["height"] > h].shape[0]
