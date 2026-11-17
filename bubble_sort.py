"""
bubble_sort.py  -  the complete Bubble Sort logic (no Flask / HTML in this file).

Smart (optimized) Bubble Sort:
  * after every round the biggest remaining number is locked in its place,
    so the next round makes one comparison fewer
  * if a round has 0 swaps -> the array is already sorted -> stop (early exit)

Every comparison is saved as a "step" in a trace, so the animation shows
exactly what Python did.

Run from the command line:
    python bubble_sort.py 5 3 8 1 9
    python bubble_sort.py 5 3 8 1 9 --save output/result.json
"""
import json
import sys
from pathlib import Path

MAX_LEN = 50          # API limit (the animation board shows 10 tiles)
MIN_VALUE, MAX_VALUE = -99, 999


def validate_array(data, max_len=MAX_LEN):
    """Checks that the input is a list of integers. Raises ValueError otherwise."""
    if not isinstance(data, list) or len(data) == 0:
        raise ValueError("array must be a non-empty list of integers")
    if len(data) > max_len:
        raise ValueError(f"array can have at most {max_len} numbers")
    for v in data:
        if isinstance(v, bool) or not isinstance(v, int):
            raise ValueError("every item must be an integer")
        if not MIN_VALUE <= v <= MAX_VALUE:
            raise ValueError(f"numbers must be between {MIN_VALUE} and {MAX_VALUE}")
    return list(data)


def bubble_sort_trace(values):
    """Sorts the array and returns every step plus the counters (JSON-friendly dict)."""
    arr = list(values)
    n = len(arr)
    steps = []
    comparisons = swaps = rounds = 0

    for p in range(n - 1):                      # p = round number (starts at 0)
        rounds += 1
        swapped = False
        for j in range(n - 1 - p):              # the last p items are already in place
            comparisons += 1
            a, b = arr[j], arr[j + 1]
            do_swap = a > b                     # '>' (not '>=') keeps equal numbers in their original order
            if do_swap:
                arr[j], arr[j + 1] = b, a
                swaps += 1
                swapped = True
            steps.append({
                "step": comparisons, "round": rounds, "index": j,
                "a": a, "b": b, "swap": do_swap,
                "comparisons": comparisons, "swaps": swaps,
                "array": list(arr), "locked": [], "done": False,
            })
        # round finished: the item at index n-1-p is now final
        last = steps[-1]
        last["locked"] = [n - 1 - p]
        if not swapped:                         # smart boy: 0 swaps => everything is sorted, stop
            last["locked"] += list(range(0, n - 1 - p))
            last["done"] = True
            break
        if p == n - 2:
            last["locked"].append(0)
            last["done"] = True

    max_comparisons = n * (n - 1) // 2
    return {
        "original": list(values),
        "sorted": arr,
        "comparisons": comparisons,
        "swaps": swaps,
        "rounds": rounds,
        "max_comparisons": max_comparisons,
        "saved_comparisons": max_comparisons - comparisons,
        "early_exit": comparisons < max_comparisons,
        "steps": steps,
    }


if __name__ == "__main__":
    args = [a for a in sys.argv[1:]]
    save_to = None
    if "--save" in args:
        i = args.index("--save")
        save_to = args[i + 1]
        del args[i:i + 2]
    try:
        nums = validate_array([int(x) for x in args])
    except ValueError as err:
        sys.exit(f"Error: {err}\nUsage: python bubble_sort.py 5 3 8 1 9 [--save output/result.json]")
    res = bubble_sort_trace(nums)
    print("Original   :", res["original"])
    print("Sorted     :", res["sorted"])
    print("Comparisons:", res["comparisons"])
    print("Swaps      :", res["swaps"])
    print("Rounds     :", res["rounds"])
    if save_to:
        Path(save_to).parent.mkdir(parents=True, exist_ok=True)
        Path(save_to).write_text(json.dumps(res, indent=2), encoding="utf-8")
        print("Saved JSON :", save_to)
