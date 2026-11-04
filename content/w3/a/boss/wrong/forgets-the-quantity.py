import io
import json
import pandas as pd


def read_sales(text):
    df = pd.read_csv(io.StringIO(text), dtype=str)
    return [
        {"product": r["product"], "quantity": int(r["quantity"]), "price": float(r["price"].replace(",", ""))}
        for r in df.to_dict("records")
    ]


def totals(sales):
    result = {}
    for s in sales:
        result[s["product"]] = result.get(s["product"], 0.0) + s["price"]
    return result


def save_report(path, sales):
    by_product = totals(sales)
    best = max(by_product, key=by_product.get) if by_product else None
    report = {"total": sum(by_product.values()), "by_product": by_product, "best": best}
    with open(path, "w") as f:
        json.dump(report, f)


def load_report(path):
    with open(path) as f:
        return json.load(f)
