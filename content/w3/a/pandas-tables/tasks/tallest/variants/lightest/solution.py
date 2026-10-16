import io
import pandas as pd


def lightest(text):
    df = pd.read_csv(io.StringIO(text))
    return df.sort_values("kg").iloc[0]["pack"]
