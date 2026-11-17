/* sorter.js - exactly the same logic as bubble_sort.py, written in JavaScript.
   Only used when the Flask backend is not available (for example on GitHub Pages). */
window.BubbleSorter = {
  trace: function (values) {
    var arr = values.slice(), n = arr.length, steps = [];
    var comparisons = 0, swaps = 0, rounds = 0;
    for (var p = 0; p < n - 1; p++) {
      rounds++;
      var swapped = false;
      for (var j = 0; j < n - 1 - p; j++) {
        comparisons++;
        var a = arr[j], b = arr[j + 1], doSwap = a > b;
        if (doSwap) { arr[j] = b; arr[j + 1] = a; swaps++; swapped = true; }
        steps.push({ step: comparisons, round: rounds, index: j, a: a, b: b, swap: doSwap,
          comparisons: comparisons, swaps: swaps, array: arr.slice(), locked: [], done: false });
      }
      var last = steps[steps.length - 1];
      last.locked = [n - 1 - p];
      if (!swapped) {
        for (var k = 0; k < n - 1 - p; k++) last.locked.push(k);
        last.done = true; break;
      }
      if (p === n - 2) { last.locked.push(0); last.done = true; }
    }
    var max = n * (n - 1) / 2;
    return { original: values.slice(), sorted: arr, comparisons: comparisons, swaps: swaps,
      rounds: rounds, max_comparisons: max, saved_comparisons: max - comparisons,
      early_exit: comparisons < max, steps: steps };
  }
};
