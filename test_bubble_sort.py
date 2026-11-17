import random
import unittest

from bubble_sort import bubble_sort_trace, validate_array


class BubbleSortTests(unittest.TestCase):
    def test_sorts_like_python(self):
        for _ in range(200):
            data = [random.randint(-99, 999) for _ in range(random.randint(1, 12))]
            self.assertEqual(bubble_sort_trace(data)["sorted"], sorted(data))

    def test_swaps_equal_inversions(self):
        data = [5, 1, 4, 2, 8]
        inversions = sum(data[i] > data[j] for i in range(5) for j in range(i + 1, 5))
        self.assertEqual(bubble_sort_trace(data)["swaps"], inversions)

    def test_known_example(self):
        r = bubble_sort_trace([5, 1, 4, 2, 8])
        self.assertEqual((r["comparisons"], r["swaps"], r["rounds"]), (9, 4, 3))

    def test_early_exit_on_sorted(self):
        r = bubble_sort_trace([1, 2, 3, 4, 5])
        self.assertEqual((r["comparisons"], r["swaps"], r["rounds"]), (4, 0, 1))
        self.assertTrue(r["steps"][-1]["done"])

    def test_reversed_is_worst_case(self):
        r = bubble_sort_trace([5, 4, 3, 2, 1])
        self.assertEqual((r["comparisons"], r["swaps"]), (10, 10))

    def test_single_item(self):
        r = bubble_sort_trace([7])
        self.assertEqual((r["comparisons"], r["steps"]), (0, []))

    def test_validation(self):
        for bad in ([], "abc", [1, "2"], [True], [1.5], [10 ** 6], None):
            with self.assertRaises(ValueError):
                validate_array(bad)


if __name__ == "__main__":
    unittest.main()
