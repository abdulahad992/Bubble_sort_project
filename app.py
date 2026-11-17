"""
app.py - the whole project in one file: Bubble Sort logic + Flask server.

  python app.py                 -> starts the website at http://127.0.0.1:5000
  python app.py 5 3 8 1 9       -> sorts in the terminal and prints the counters
  python app.py 5 3 8 1 9 --save output/result.json    (also saves the result as JSON)

API: POST /api/sort  {"array": [5, 1, 4, 2, 8]}   |   GET /api/health
"""
import json
import os
import sys
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

DOCS = Path(__file__).resolve().parent / "docs"     # frontend folder (GitHub Pages can host it too)
MAX_LEN, MIN_VALUE, MAX_VALUE = 50, -99, 999

app = Flask(__name__, static_folder=str(DOCS), static_url_path="")


# ------------------------- Bubble Sort logic -------------------------
def validate_array(data, max_len=MAX_LEN):
    """Checks that the input is a list of integers. Raises ValueError otherwise."""
    if not isinstance(data, list) or not data:
        raise ValueError("array must be a non-empty list of integers")
    if len(data) > max_len:
        raise ValueError(f"array can have at most {max_len} numbers")
    if any(isinstance(v, bool) or not isinstance(v, int) for v in data):
        raise ValueError("every item must be an integer")
    if any(not MIN_VALUE <= v <= MAX_VALUE for v in data):
        raise ValueError(f"numbers must be between {MIN_VALUE} and {MAX_VALUE}")
    return list(data)


def bubble_sort_trace(values):
    """Smart Bubble Sort: returns the sorted array, the counters and every step (for the animation)."""
    arr, n = list(values), len(values)               # work on a copy
    steps, comparisons, swaps, rounds = [], 0, 0, 0

    for p in range(n - 1):                           # OUTER LOOP: one round per pass, the biggest number "bubbles" to the end
        rounds += 1
        swapped = False
        for j in range(n - 1 - p):                   # INNER LOOP: compare neighbours (last p items are already in place)
            comparisons += 1                         # COMPARISON COUNTER
            a, b = arr[j], arr[j + 1]
            do_swap = a > b                          # '>' (not '>=') keeps equal numbers in their original order
            if do_swap:
                arr[j], arr[j + 1] = b, a
                swaps += 1                           # SWAP COUNTER
                swapped = True
            steps.append({"step": comparisons, "round": rounds, "index": j, "a": a, "b": b, "swap": do_swap,
                          "comparisons": comparisons, "swaps": swaps, "array": list(arr), "locked": [], "done": False})
        last = steps[-1]
        last["locked"] = [n - 1 - p]                 # the item at index n-1-p is now final
        if not swapped:                              # EARLY EXIT (smart boy): 0 swaps => already sorted, stop
            last["locked"] += range(n - 1 - p)
            last["done"] = True
            break
        if p == n - 2:
            last["locked"].append(0)
            last["done"] = True

    most = n * (n - 1) // 2
    return {"original": list(values), "sorted": arr, "comparisons": comparisons, "swaps": swaps, "rounds": rounds,
            "max_comparisons": most, "saved_comparisons": most - comparisons, "early_exit": comparisons < most,
            "steps": steps}


# ------------------------- Flask server -------------------------
@app.get("/")
def index():
    return send_from_directory(DOCS, "index.html")


@app.get("/api/health")
def health():
    return jsonify(status="ok", engine="python-flask")


@app.post("/api/sort")
def sort_api():
    try:
        values = validate_array((request.get_json(silent=True) or {}).get("array"))
    except ValueError as err:
        return jsonify(error=str(err)), 400
    return jsonify(bubble_sort_trace(values))


# ------------------------- Terminal mode -------------------------
def run_cli(args):
    save = None
    if "--save" in args:
        i = args.index("--save")
        save = args[i + 1] if i + 1 < len(args) else None
        del args[i:i + 2]
    try:
        res = bubble_sort_trace(validate_array([int(x) for x in args]))
    except ValueError as err:
        sys.exit(f"Error: {err}\nUsage: python app.py 5 3 8 1 9 [--save output/result.json]")
    for label, key in [("Original", "original"), ("Sorted", "sorted"), ("Comparisons", "comparisons"),
                       ("Swaps", "swaps"), ("Rounds", "rounds")]:
        print(f"{label:<11}: {res[key]}")
    if save:
        Path(save).parent.mkdir(parents=True, exist_ok=True)
        Path(save).write_text(json.dumps(res, indent=2), encoding="utf-8")
        print("Saved JSON :", save)


if __name__ == "__main__":
    if sys.argv[1:]:
        run_cli(sys.argv[1:])
    else:
        app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=os.environ.get("FLASK_DEBUG") == "1")
