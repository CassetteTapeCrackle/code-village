import io
import pandas as pd


def names_in(text, team):
    df = pd.read_csv(io.StringIO(text))
    return df.loc[df["team"] == team, "name"].tolist()
